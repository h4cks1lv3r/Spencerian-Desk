package com.royal.spencerianlab;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/index.html";
    private static final int PICK_IMAGE = 101, EXPORT_FILE = 102, IMPORT_BACKUP = 103;
    private WebView web;
    private SecureProviderStore vault;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService fileWorker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean aiBusy = new AtomicBoolean(false);
    private File pendingExport;
    private String pendingFilename;
    private boolean pickerBusy;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        startCourse();
    }

    private void startCourse() {
        try {
            openCourse();
        } catch (RuntimeException | LinkageError failure) {
            showStartupFailure(failure);
        }
    }

    private void openCourse() {
        final int paperColor = Color.rgb(248, 246, 241);
        getWindow().setStatusBarColor(paperColor);
        getWindow().setNavigationBarColor(paperColor);
        vault = new SecureProviderStore(this);
        File[] oldExports = getCacheDir().listFiles((dir, name) -> name.startsWith("spencerian-export-"));
        if (oldExports != null) for (File item : oldExports) {
            if (System.currentTimeMillis() - item.lastModified() > 86400000L) item.delete();
        }
        web = new WebView(this); web.setBackgroundColor(paperColor);
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false); settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false); settings.setDisplayZoomControls(false);
        settings.setSafeBrowsingEnabled(true);
        android.webkit.CookieManager.getInstance().setAcceptCookie(false);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new LocalClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("Continue", (d, w) -> result.confirm())
                    .setNegativeButton("Cancel", (d, w) -> result.cancel()).setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK", (d, w) -> result.confirm())
                    .setOnCancelListener(d -> result.confirm()).show(); return true;
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "SpencerianNative");
        setContentView(web);
        // PhoneWindow.getInsetsController() dereferences its DecorView. Create the
        // content/decor first; calling it earlier crashes before the course opens.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                int lightBars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(lightBars, lightBars);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
        // Keep all app controls clear of Android 15/16 edge-to-edge system bars.
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        web.loadUrl(HOME);
    }

    private void showStartupFailure(Throwable failure) {
        WebView previous = web;
        web = null;
        disposeWebView(previous);
        StartupRecovery.show(this, failure, this::startCourse);
    }

    private static void disposeWebView(WebView view) {
        if (view == null) return;
        // A failed renderer/provider can reject cleanup calls. Still attempt every step.
        try {
            if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
        } catch (RuntimeException | LinkageError ignored) { }
        try { view.removeJavascriptInterface("SpencerianNative"); } catch (RuntimeException | LinkageError ignored) { }
        try { view.stopLoading(); } catch (RuntimeException | LinkageError ignored) { }
        try { view.destroy(); } catch (RuntimeException | LinkageError ignored) { }
    }

    private final class LocalClient extends WebViewClient {
        @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (view == web) {
                showStartupFailure(new IllegalStateException(detail.didCrash()
                    ? "Android's page renderer stopped unexpectedly."
                    : "Android closed the page renderer to reclaim memory."));
            } else {
                disposeWebView(view);
            }
            return true;
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (HOME.equals(uri.toString().split("#", 2)[0])) return false;
            if (request.isForMainFrame() && request.hasGesture()) openExternal(uri.toString());
            return true;
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"GET".equals(request.getMethod()) || !"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost()) || uri.getPort() != -1)
                return blocked();
            String path = uri.getPath();
            if (path == null || !path.startsWith("/assets/") || path.contains("..") || path.contains("\\") || path.indexOf('\u0000') >= 0) return blocked();
            try {
                InputStream input = getAssets().open(path.substring(8));
                Map<String,String> headers = new HashMap<>();
                headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
                headers.put("X-Content-Type-Options", "nosniff"); headers.put("Cache-Control", "no-store");
                return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", headers, input);
            } catch (Exception ignored) { return blocked(); }
        }
        @Override public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) { handler.cancel(); }
    }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html"; if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css"; if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml"; if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".webp")) return "image/webp"; if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff"; if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".pdf")) return "application/pdf"; return "application/octet-stream";
    }
    private static WebResourceResponse blocked() { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0])); }
    private void event(String name, JSONObject detail) {
        final String script = "window.dispatchEvent(new CustomEvent(" + JSONObject.quote(name) + ",{detail:" + detail.toString() + "}));";
        runOnUiThread(() -> { if (web != null && !isFinishing() && !isDestroyed()) web.evaluateJavascript(script, null); });
    }
    private void aiResult(String id, boolean ok, String value) {
        try { event("native-ai-result", new JSONObject().put("id", id).put("ok", ok).put("text", ok ? value : "").put("error", ok ? "" : value)); }
        catch (Exception ignored) { }
    }
    private void pickerError(String eventName, String error) {
        try { event(eventName, new JSONObject().put("ok", false).put("error", error)); } catch (Exception ignored) { }
    }
    private void openExternal(String address) {
        runOnUiThread(() -> {
            try {
                Uri uri = Uri.parse(address);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) return;
                Intent intent = new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE);
                startActivity(intent);
            } catch (Exception ignored) { pickerError("native-notice", "No browser is available for this link."); }
        });
    }
    public final class NativeBridge {
        @JavascriptInterface public String getProviderStatus() {
            try { return vault.status().toString(); } catch (Exception e) { return "{\"providers\":[],\"secureStorage\":true,\"error\":\"Could not read provider settings.\"}"; }
        }
        @JavascriptInterface public String saveProvider(String configJson) {
            try { if (configJson == null || configJson.length() > 6500) throw new IllegalArgumentException("Provider settings are too large."); vault.save(new JSONObject(configJson)); return "{\"ok\":true}"; }
            catch (IllegalArgumentException e) { return resultError(e.getMessage()); }
            catch (Exception e) { return resultError("Could not save credentials. Check all fields and try again."); }
        }
        @JavascriptInterface public String deleteProvider(String provider) {
            try { vault.delete(provider); return "{\"ok\":true}"; } catch (Exception e) { return resultError("Could not remove this provider."); }
        }
        @JavascriptInterface public void requestAI(String requestId, String payloadJson) {
            final String id = requestId == null ? "" : requestId;
            if (!id.matches("[A-Za-z0-9_-]{1,100}")) { aiResult(id, false, "Invalid request ID."); return; }
            if (!aiBusy.compareAndSet(false, true)) { aiResult(id, false, "Wait for the current request to finish."); return; }
            try {
                if (payloadJson == null || payloadJson.length() > 7100000) throw new AiClient.UserError("Request is too large.");
                final JSONObject payload = new JSONObject(payloadJson);
                final String provider = SecureProviderStore.canonical(payload.getString("provider"));
                final JSONObject config = vault.load(provider);
                if (config == null) throw new AiClient.UserError("Add this provider's API key in Settings first.");
                final String destination = "custom".equals(provider) ? new java.net.URI(config.getString("endpoint")).getHost() : provider;
                final boolean hasImage = !payload.optString("image", "").isEmpty();
                runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this).setTitle("Send to " + destination + "?")
                    .setMessage("Your prompt" + (hasImage ? " and selected handwriting image" : "") + " will be sent to this AI provider using " + config.optString("model") + ". API use may cost money. Provider data policies apply. Your saved lesson progress stays on this device.")
                    .setPositiveButton("Send", (d, w) -> worker.execute(() -> {
                        try { aiResult(id, true, AiClient.request(config, payload)); }
                        catch (AiClient.UserError e) { aiResult(id, false, e.getMessage()); }
                        catch (java.net.SocketTimeoutException e) { aiResult(id, false, "The provider timed out. Check your connection and try again."); }
                        catch (Exception e) { aiResult(id, false, "Could not reach the AI provider or read its response. Check your network and model settings."); }
                        finally { aiBusy.set(false); }
                    }))
                    .setNegativeButton("Cancel", (d, w) -> { aiBusy.set(false); aiResult(id, false, "Request canceled."); })
                    .setOnCancelListener(d -> { aiBusy.set(false); aiResult(id, false, "Request canceled."); }).show());
            } catch (AiClient.UserError e) { aiBusy.set(false); aiResult(id, false, e.getMessage()); }
            catch (Exception e) { aiBusy.set(false); aiResult(id, false, "Provider settings are incomplete. Save a valid API key and model in Settings."); }
        }
        @JavascriptInterface public void openExternal(String address) { MainActivity.this.openExternal(address); }
        @JavascriptInterface public void finishApp() { runOnUiThread(() -> finish()); }
        @JavascriptInterface public void importImage() { launchPicker(PICK_IMAGE, "image/*", "native-image"); }
        @JavascriptInterface public void importBackup() { launchPicker(IMPORT_BACKUP, "*/*", "native-import"); }
        @JavascriptInterface public void exportFile(String filename, String mimeType, String encoded) {
            try {
                if (encoded == null || encoded.length() > ((long)FileTransfer.MAX_FILE_BYTES + 2L) / 3L * 4L) throw new Exception();
                final String safeName = (filename == null ? "spencerian-export" : filename).replaceAll("[^A-Za-z0-9._-]", "_");
                if (safeName.length() == 0 || safeName.length() > 120) throw new Exception();
                final String type = mimeType != null && mimeType.matches("(application/(json|pdf|octet-stream)|text/(plain|csv)|image/(png|jpeg|svg\\+xml))") ? mimeType : "application/octet-stream";
                runOnUiThread(() -> {
                    if (pickerBusy) { pickerError("native-export", "Finish the open file picker first."); return; }
                    pickerBusy = true;
                    fileWorker.execute(() -> {
                        File staged = null;
                        try {
                            staged = File.createTempFile("spencerian-export-", ".tmp", getCacheDir());
                            try (OutputStream output = new FileOutputStream(staged)) {
                                FileTransfer.decodeBase64To(encoded, output, FileTransfer.MAX_FILE_BYTES);
                            }
                            final File ready = staged;
                            runOnUiThread(() -> {
                                if (isFinishing() || isDestroyed()) { ready.delete(); pickerBusy = false; return; }
                                pendingExport = ready; pendingFilename = safeName;
                                try { startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE, safeName), EXPORT_FILE); }
                                catch (Exception e) { pickerBusy = false; clearPendingExport(); pickerError("native-export", "No file picker is available."); }
                            });
                        } catch (Exception e) {
                            if (staged != null) staged.delete();
                            runOnUiThread(() -> pickerBusy = false);
                            pickerError("native-export", "Could not export this file. Maximum size is 40 MB.");
                        }
                    });
                });
            } catch (Exception e) { pickerError("native-export", "Could not export this file. Maximum size is 40 MB."); }
        }
    }
    private static String resultError(String message) { try { return new JSONObject().put("ok", false).put("error", message).toString(); } catch (Exception e) { return "{\"ok\":false}"; } }
    private void launchPicker(int requestCode, String type, String name) {
        runOnUiThread(() -> {
            if (pickerBusy) { pickerError(name, "Finish the open file picker first."); return; }
            pickerBusy = true;
            try { startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type), requestCode); }
            catch (ActivityNotFoundException e) { pickerBusy = false; pickerError(name, "No file picker is available."); }
        });
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_IMAGE && request != EXPORT_FILE && request != IMPORT_BACKUP) return;
        pickerBusy = false;
        String name = request == PICK_IMAGE ? "native-image" : request == EXPORT_FILE ? "native-export" : "native-import";
        if (result != RESULT_OK || data == null || data.getData() == null) { clearPendingExport(); pickerError(name, "Canceled."); return; }
        final Uri uri = data.getData();
        final File exportFile = pendingExport; final String filename = pendingFilename; pendingExport = null;
        fileWorker.execute(() -> {
            try {
                if (request == EXPORT_FILE) {
                    if (exportFile == null) throw new Exception("Export expired");
                    try (InputStream input = new FileInputStream(exportFile); OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                        if (output == null) throw new Exception(); FileTransfer.copyBounded(input, output, FileTransfer.MAX_FILE_BYTES);
                    }
                    event(name, new JSONObject().put("ok", true).put("filename", filename));
                } else if (request == PICK_IMAGE) {
                    event(name, new JSONObject().put("ok", true).put("dataUrl", readImage(uri)));
                } else {
                    String text;
                    try (InputStream input = getContentResolver().openInputStream(uri)) { if (input == null) throw new Exception(); text = FileTransfer.readUtf8Bounded(input, FileTransfer.MAX_FILE_BYTES); }
                    // Validation of schema and user choice belongs to the local app; no automatic merge here.
                    event(name, new JSONObject().put("ok", true).put("text", text));
                }
            } catch (Exception e) { pickerError(name, request == PICK_IMAGE ? "Could not load this image. Choose a JPEG or PNG file." : "Could not read or save this file."); }
            finally { if (exportFile != null) exportFile.delete(); }
        });
    }
    private void clearPendingExport() { if (pendingExport != null) { pendingExport.delete(); pendingExport = null; } }
    private String readImage(Uri uri) throws Exception {
        BitmapFactory.Options options = new BitmapFactory.Options(); options.inJustDecodeBounds = true;
        try (InputStream input = getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(input, null, options); }
        if (options.outWidth <= 0 || options.outHeight <= 0 || options.outWidth > 50000 || options.outHeight > 50000) throw new Exception();
        int sample = 1; while (Math.max(options.outWidth, options.outHeight) / sample > 1600) sample *= 2;
        options.inJustDecodeBounds = false; options.inSampleSize = sample; options.inPreferredConfig = Bitmap.Config.ARGB_8888;
        Bitmap bitmap;
        try (InputStream input = getContentResolver().openInputStream(uri)) { bitmap = BitmapFactory.decodeStream(input, null, options); }
        if (bitmap == null) throw new Exception();
        try {
            int orientation = ExifInterface.ORIENTATION_NORMAL;
            try (InputStream input = getContentResolver().openInputStream(uri)) { orientation = new ExifInterface(input).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL); }
            catch (Exception ignored) { }
            Matrix transform = new Matrix();
            switch (orientation) {
                case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: transform.setScale(-1, 1); break;
                case ExifInterface.ORIENTATION_ROTATE_180: transform.setRotate(180); break;
                case ExifInterface.ORIENTATION_FLIP_VERTICAL: transform.setScale(1, -1); break;
                case ExifInterface.ORIENTATION_TRANSPOSE: transform.setRotate(90); transform.postScale(-1, 1); break;
                case ExifInterface.ORIENTATION_ROTATE_90: transform.setRotate(90); break;
                case ExifInterface.ORIENTATION_TRANSVERSE: transform.setRotate(-90); transform.postScale(-1, 1); break;
                case ExifInterface.ORIENTATION_ROTATE_270: transform.setRotate(270); break;
                default: break;
            }
            if (!transform.isIdentity()) { Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), transform, true); if (rotated != bitmap) { bitmap.recycle(); bitmap = rotated; } }
            ByteArrayOutputStream output = new ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.JPEG, 90, output);
            return "data:image/jpeg;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } finally { bitmap.recycle(); }
    }
    @Override public void onBackPressed() { if (web != null) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-back'));", null); else super.onBackPressed(); }
    @Override protected void onDestroy() {
        worker.shutdownNow();
        fileWorker.shutdownNow(); clearPendingExport();
        WebView previous = web;
        web = null;
        disposeWebView(previous);
        super.onDestroy();
    }
}
