package com.royal.spencerianlab;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

/** JVM tests for the native transport's security boundaries. No provider keys required. */
public final class NativeSafetyTest {
    private static int checks = 0;
    static void expect(boolean pass, String description) {
        checks++;
        if (!pass) throw new AssertionError(description);
    }
    static void reject(String endpoint) throws Exception {
        boolean failed = false;
        try { AiClient.validateEndpoint(endpoint); } catch (IllegalArgumentException e) { failed = true; }
        expect(failed, "Endpoint must be rejected: " + endpoint);
    }
    public static void main(String[] args) throws Exception {
        expect(AiClient.validateEndpoint("https://example.com/v1/chat/completions").equals("https://example.com/v1/chat/completions"), "Complete HTTPS custom endpoint accepted");
        expect(AiClient.validateEndpoint(" https://api.example.com:443/chat/completions ").equals("https://api.example.com:443/chat/completions"), "HTTPS port accepted");
        reject("http://example.com/v1/chat/completions");
        reject("https://user:secret@example.com/v1/chat/completions");
        reject("https://example.com/v1/chat/completions?key=secret");
        reject("https://example.com/v1/chat/completions#fragment");
        reject("https://example.com:8443/v1/chat/completions");
        reject("https://example.com/v1");
        reject("https://example.com/v1/chat/completions/anything");
        reject("file:///v1/chat/completions");
        reject("javascript:alert(1)");
        expect("hello".equals(AiClient.readBounded(new ByteArrayInputStream("hello".getBytes("UTF-8")), 5)), "Body accepted at byte limit");
        boolean bounded = false;
        try { AiClient.readBounded(new ByteArrayInputStream("123456".getBytes("UTF-8")), 5); }
        catch (AiClient.UserError e) { bounded = true; }
        expect(bounded, "Oversized response rejected");
        expect("anthropic".equals(SecureProviderStore.canonical("claude")), "Claude alias");
        expect("openai".equals(SecureProviderStore.canonical("chatgpt")), "ChatGPT alias");
        boolean unsupported = false;
        try { SecureProviderStore.canonical("unknown"); } catch (IllegalArgumentException e) { unsupported = true; }
        expect(unsupported, "Unknown provider rejected");
        SecureProviderStore.requireSameKeyDestination("custom", "https://a.example/v1/chat/completions", "https://a.example/v1/chat/completions");
        boolean changedDestination = false;
        try { SecureProviderStore.requireSameKeyDestination("custom", "https://a.example/v1/chat/completions", "https://b.example/v1/chat/completions"); }
        catch (IllegalArgumentException e) { changedDestination = true; }
        expect(changedDestination, "Saved key cannot silently move to a different custom endpoint");
        SecureProviderStore.validateKey("sk-test_fake-key123");
        for (String key : new String[]{"", "line\r\nheader", "has\ttab", "has space", "has\u0000null", "has\u0080non-ascii"}) {
            boolean invalid = false;
            try { SecureProviderStore.validateKey(key); } catch (IllegalArgumentException e) { invalid = true; }
            expect(invalid, "Header-unsafe API key rejected");
        }
        ByteArrayOutputStream decoded = new ByteArrayOutputStream();
        FileTransfer.decodeBase64To(Base64.getEncoder().encodeToString("hello".getBytes("UTF-8")), decoded, 5);
        expect("hello".equals(decoded.toString("UTF-8")), "Streaming base64 export preserves bytes");
        boolean tooLarge = false;
        try { FileTransfer.decodeBase64To("MTIzNDU2", new ByteArrayOutputStream(), 5); } catch (IOException e) { tooLarge = true; }
        expect(tooLarge, "Streaming decoder rejects excess decoded bytes even inside encoded size cap");
        boolean malformed = false;
        try { FileTransfer.decodeBase64To("####", new ByteArrayOutputStream(), 5); } catch (IOException e) { malformed = true; }
        expect(malformed, "Malformed base64 rejected");
        String unicode = "pen\u270d";
        expect(unicode.equals(FileTransfer.readUtf8Bounded(new ByteArrayInputStream(unicode.getBytes("UTF-8")), 6)), "UTF-8 backup import preserves Unicode");
        boolean utf8Size = false;
        try { FileTransfer.readUtf8Bounded(new ByteArrayInputStream(unicode.getBytes("UTF-8")), 5); } catch (IOException e) { utf8Size = true; }
        expect(utf8Size, "Backup limit counts bytes rather than characters");
        expect(FileTransfer.MAX_FILE_BYTES == 40_000_000, "Native and frontend backup size limits match");
        System.out.println("PASS: " + checks + " native boundary checks");
    }
}
