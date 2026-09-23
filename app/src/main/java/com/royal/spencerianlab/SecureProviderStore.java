package com.royal.spencerianlab;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Keys never cross back into the JavaScript context. Android backup is disabled. */
final class SecureProviderStore {
    static final String[] PROVIDERS = {"openai", "anthropic", "gemini", "custom"};
    private static final String ALIAS = "spencerian.provider.v1";
    private final SharedPreferences prefs;
    SecureProviderStore(Context context) { prefs = context.getSharedPreferences("provider_vault", Context.MODE_PRIVATE); }

    private SecretKey secret() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }
    static String canonical(String provider) {
        if ("claude".equals(provider)) return "anthropic";
        if ("chatgpt".equals(provider)) return "openai";
        if ("google".equals(provider)) return "gemini";
        for (String p : PROVIDERS) if (p.equals(provider)) return p;
        throw new IllegalArgumentException("Choose a supported provider.");
    }
    synchronized JSONObject load(String provider) throws Exception {
        provider = canonical(provider);
        String stored = prefs.getString(provider, null);
        if (stored == null) return null;
        JSONObject envelope = new JSONObject(stored);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secret(), new GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)));
        cipher.updateAAD(provider.getBytes("UTF-8"));
        byte[] plain = cipher.doFinal(Base64.decode(envelope.getString("ciphertext"), Base64.NO_WRAP));
        return new JSONObject(new String(plain, "UTF-8"));
    }
    synchronized void save(JSONObject input) throws Exception {
        String provider = canonical(input.getString("provider"));
        String endpoint = "custom".equals(provider) ? AiClient.validateEndpoint(input.optString("endpoint", "")) : "";
        String key = input.optString("key", "").trim();
        if (key.isEmpty()) {
            JSONObject old = load(provider);
            if (old != null) {
                requireSameKeyDestination(provider, old.optString("endpoint", ""), endpoint);
                key = old.optString("key", "");
            }
        }
        validateKey(key);
        String model = input.optString("model", "").trim();
        if (!model.matches("[A-Za-z0-9][A-Za-z0-9_.:/-]{0,149}")) throw new IllegalArgumentException("Enter a valid model ID.");
        JSONObject config = new JSONObject().put("provider", provider).put("key", key).put("model", model).put("endpoint", endpoint);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, secret());
        cipher.updateAAD(provider.getBytes("UTF-8"));
        JSONObject envelope = new JSONObject().put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(cipher.doFinal(config.toString().getBytes("UTF-8")), Base64.NO_WRAP));
        if (!prefs.edit().putString(provider, envelope.toString()).commit()) throw new Exception("Storage unavailable");
    }
    static void requireSameKeyDestination(String provider, String oldEndpoint, String newEndpoint) {
        if ("custom".equals(provider) && !oldEndpoint.equals(newEndpoint))
            throw new IllegalArgumentException("The API endpoint changed. Enter the key for this endpoint explicitly before saving.");
    }
    static void validateKey(String key) {
        if (key == null || key.isEmpty() || key.length() > 4096) throw new IllegalArgumentException("Enter a valid API key.");
        for (int i = 0; i < key.length(); i++)
            if (key.charAt(i) < 33 || key.charAt(i) > 126) throw new IllegalArgumentException("API keys cannot contain spaces or control characters.");
    }
    synchronized void delete(String provider) throws Exception {
        if (!prefs.edit().remove(canonical(provider)).commit()) throw new Exception("Storage unavailable");
    }
    synchronized JSONObject status() throws Exception {
        JSONArray list = new JSONArray();
        for (String p : PROVIDERS) {
            JSONObject config = null; boolean error = false;
            try { config = load(p); } catch (Exception ignored) { error = true; }
            list.put(new JSONObject().put("id", p).put("provider", p).put("configured", config != null)
                .put("model", config == null ? "" : config.optString("model"))
                .put("endpoint", config == null ? "" : config.optString("endpoint"))
                .put("needsReset", error));
        }
        return new JSONObject().put("providers", list).put("secureStorage", true);
    }
}
