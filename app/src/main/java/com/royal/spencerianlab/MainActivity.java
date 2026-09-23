package com.royal.spencerianlab;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsetsController;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/index.html";
    private static final int PICK_IMAGE = 101, EXPORT_FILE = 102, IMPORT_BACKUP = 103, IMPORT_STREAM = 104;
    private WebView web;
    private SecureProviderStore vault;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService fileWorker = Executors.newSingleThreadExecutor();
    private final ExecutorService closeWorker = Executors.newSingleThreadExecutor();
    private final Object aiLock = new Object();
    private String activeAiId;
    private AiClient.Cancellation activeAi;
    private AlertDialog aiConsent;
    private String aiConsentId;
    private File pendingExport;
    private String pendingFilename;
    private volatile boolean pickerBusy;
    private boolean pickerInFlight;
    private volatile boolean trustedPage;
    private volatile boolean destroying;
    private boolean pageReady;
    private final List<String> pendingEvents = new ArrayList<>();
    private Object backCallback;
    private boolean backRegistered;
    private final Object transferLock = new Object();
    private File chunkExport;
    private OutputStream chunkOutput;
    private String chunkExportId, chunkFilename, chunkMime;
    private long chunkBytes;
    private FileTransfer.TextChunks chunkInput;
    private String chunkImportId;
    private boolean importReadPending;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            pickerInFlight = state.getBoolean("pickerInFlight", false);
            pickerBusy = pickerInFlight;
            String export = state.getString("pendingExport");
            if (export != null && export.matches("spencerian-export-[A-Za-z0-9._-]+")) {
                File restored = new File(getCacheDir(), export);
                if (restored.isFile()) { pendingExport = restored; pendingFilename = state.getString("pendingFilename", "spencerian-export"); }
            }
        }
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
        settings.setSupportZoom(true); settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false);
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
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(paperColor);
        container.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(container);
        // PhoneWindow.getInsetsController() dereferences its DecorView. Create the
        // content/decor first; calling it earlier crashes before the course opens.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
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
        // Android 11+ is explicitly edge to edge above. WebView does not lay out
        // web content within its own padding, so inset the parent instead. Older
        // Android decor already fits the content within the system bars; adding
        // parent padding there would leave a second, unwanted inset.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            container.setOnApplyWindowInsetsListener(MainActivity::applyContentInsets);
            container.requestApplyInsets();
        }
        if (Build.VERSION.SDK_INT >= 33) backCallback = BackApi33.create(this::dispatchBack);
        trustedPage = true;
        web.loadUrl(HOME);
    }

    /** Only invoked on API 30+ after this Activity disables decor fitting. */
    static WindowInsets applyContentInsets(View view, WindowInsets insets) {
        int types = WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime();
        Insets safe = insets.getInsets(types);
        view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
        return new WindowInsets.Builder(insets).setInsets(types, Insets.NONE).build();
    }

    private void showStartupFailure(Throwable failure) {
        updateBackCallback(false);
        trustedPage = false; pageReady = false;
        cancelActiveAi(null, false);
        synchronized (transferLock) { clearChunkExport(); clearChunkImport(); pickerBusy = pickerInFlight; }
        pendingEvents.clear();
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
        @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
            trustedPage = isHome(url); pageReady = false;
            if (!trustedPage) { view.stopLoading(); view.removeJavascriptInterface("SpencerianNative"); }
        }
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
    private static boolean isHome(String url) { return url != null && HOME.equals(url.split("#", 2)[0]); }
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
        runOnUiThread(() -> {
            if (web == null || isFinishing() || isDestroyed() || !trustedPage) return;
            if (pageReady) web.evaluateJavascript(script, null);
            else if (pendingEvents.size() < 8) pendingEvents.add(script);
        });
    }
    private void aiResult(String id, boolean ok, String value) {
        aiResult(id, ok, value, false);
    }
    private void aiResult(String id, boolean ok, String value, boolean truncated) {
        try { event("native-ai-result", new JSONObject().put("id", id).put("ok", ok).put("text", ok ? value : "").put("error", ok ? "" : value).put("truncated", truncated)); }
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
            if (!trustedPage) return resultError("Unavailable outside the app.");
            try { return vault.status().toString(); } catch (Exception e) { return "{\"providers\":[],\"secureStorage\":true,\"error\":\"Could not read provider settings.\"}"; }
        }
        @JavascriptInterface public String saveProvider(String configJson) {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            try { if (configJson == null || configJson.length() > 6500) throw new IllegalArgumentException("Provider settings are too large."); vault.save(new JSONObject(configJson)); return "{\"ok\":true}"; }
            catch (IllegalArgumentException e) { return resultError(e.getMessage()); }
            catch (Exception e) { return resultError("Could not save credentials. Check all fields and try again."); }
        }
        @JavascriptInterface public String deleteProvider(String provider) {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            try { vault.delete(provider); return "{\"ok\":true}"; } catch (Exception e) { return resultError("Could not remove this provider."); }
        }
        @JavascriptInterface public void ready() {
            if (!trustedPage) return;
            runOnUiThread(() -> {
                if (web == null || !trustedPage) return;
                pageReady = true;
                for (String script : pendingEvents) web.evaluateJavascript(script, null);
                pendingEvents.clear();
            });
        }
        @JavascriptInterface public void setCanGoBack(boolean canGoBack) {
            if (trustedPage) runOnUiThread(() -> updateBackCallback(canGoBack));
        }
        @JavascriptInterface public void setSensitiveScreen(boolean sensitive) {
            if (!trustedPage) return;
            runOnUiThread(() -> {
                if (sensitive) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            });
        }
        @JavascriptInterface public String eraseCredentials() {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            cancelActiveAi(null, false);
            try { for (String provider : SecureProviderStore.PROVIDERS) vault.delete(provider); return "{\"ok\":true}"; }
            catch (Exception error) { return resultError("Could not remove all provider credentials. Please try again."); }
        }
        @JavascriptInterface public void requestAI(String requestId, String payloadJson) {
            if (!trustedPage) return;
            final String id = requestId == null ? "" : requestId;
            if (!id.matches("[A-Za-z0-9_-]{1,100}")) { aiResult(id, false, "Invalid request ID."); return; }
            final AiClient.Cancellation token = new AiClient.Cancellation();
            synchronized (aiLock) {
                if (activeAi != null) { aiResult(id, false, "Wait for the current request to finish."); return; }
                activeAi = token; activeAiId = id;
            }
            try {
                if (payloadJson == null || payloadJson.length() > 7100000) throw new AiClient.UserError("Request is too large.");
                final JSONObject payload = new JSONObject(payloadJson);
                final String provider = SecureProviderStore.canonical(payload.getString("provider"));
                final JSONObject config = vault.load(provider);
                if (config == null) throw new AiClient.UserError("Add this provider's API key in Settings first.");
                final String destination = "custom".equals(provider) ? new java.net.URI(config.getString("endpoint")).getHost() : provider;
                final boolean hasImage = !payload.optString("image", "").isEmpty();
                runOnUiThread(() -> {
                    synchronized (aiLock) { if (activeAi != token || isDestroyed() || isFinishing()) return; }
                    aiConsentId = id;
                    aiConsent = new AlertDialog.Builder(MainActivity.this).setTitle("Send to " + destination + "?")
                        .setMessage("Your prompt" + (hasImage ? " and selected handwriting image" : "") + " will be sent to this AI provider using " + config.optString("model") + ". API use may cost money. Provider data policies apply. Your saved lesson progress stays on this device.")
                        .setPositiveButton("Send", (d, w) -> {
                            aiConsent = null; aiConsentId = null;
                            worker.execute(() -> {
                                try {
                                    AiClient.Response response = AiClient.request(config, payload, token);
                                    completeAi(id, token, true, response.text, response.truncated);
                                } catch (AiClient.UserError e) { completeAi(id, token, false, e.getMessage(), false); }
                                catch (Exception e) { completeAi(id, token, false, "Could not reach the AI provider or read its response. Check your network and model settings.", false); }
                            });
                        })
                        .setNegativeButton("Cancel", (d, w) -> cancelActiveAi(id, true))
                        .setOnCancelListener(d -> cancelActiveAi(id, true)).show();
                    if (hasImage && aiConsent.getWindow() != null) aiConsent.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                });
            } catch (AiClient.UserError e) { completeAi(id, token, false, e.getMessage(), false); }
            catch (Exception e) { completeAi(id, token, false, "Provider settings are incomplete. Save a valid API key and model in Settings.", false); }
        }
        @JavascriptInterface public void cancelAI(String id) { if (trustedPage) cancelActiveAi(id, true); }
        @JavascriptInterface public void openExternal(String address) { if (trustedPage) MainActivity.this.openExternal(address); }
        @JavascriptInterface public void finishApp() { if (trustedPage) runOnUiThread(() -> finish()); }
        @JavascriptInterface public void importImage() { if (trustedPage) launchPicker(PICK_IMAGE, "image/*", "native-image"); }
        @JavascriptInterface public void importBackup() { if (trustedPage) launchPicker(IMPORT_BACKUP, "*/*", "native-import"); }
        @JavascriptInterface public void importBackupStream() { if (trustedPage) launchPicker(IMPORT_STREAM, "*/*", "native-import-start"); }
        /** Chunk calls run on WebView's bridge thread; only small chunks cross JNI. */
        @JavascriptInterface public String beginExport(String filename, String mimeType) {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            synchronized (transferLock) {
                if (pickerBusy || chunkExport != null || chunkInput != null) return resultError("Finish the current file transfer first.");
                try {
                    chunkFilename = safeFilename(filename); chunkMime = safeMime(mimeType);
                    if (getCacheDir().getUsableSpace() < 8L * 1024 * 1024) throw new java.io.IOException("Not enough free storage.");
                    chunkExport = File.createTempFile("spencerian-export-", ".tmp", getCacheDir());
                    chunkOutput = new FileOutputStream(chunkExport);
                    chunkExportId = UUID.randomUUID().toString(); chunkBytes = 0; pickerBusy = true;
                    return new JSONObject().put("ok", true).put("id", chunkExportId).toString();
                } catch (Exception error) { clearChunkExport(); return resultError("Could not stage the backup. Check free device storage."); }
            }
        }
        @JavascriptInterface public String appendExport(String id, String encoded) {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            synchronized (transferLock) {
                if (id == null || !id.equals(chunkExportId) || chunkOutput == null) return resultError("The backup export expired.");
                try {
                    if (chunkBytes > FileTransfer.MAX_BACKUP_BYTES - FileTransfer.MAX_CHUNK_BYTES) throw new java.io.IOException("Backup limit exceeded.");
                    if (getCacheDir().getUsableSpace() < FileTransfer.MAX_CHUNK_BYTES + 1024 * 1024) throw new java.io.IOException("Not enough free storage.");
                    FileTransfer.decodeBase64To(encoded, chunkOutput, FileTransfer.MAX_CHUNK_BYTES);
                    chunkBytes = chunkExport.length();
                    return new JSONObject().put("ok", true).put("bytes", chunkBytes).toString();
                } catch (Exception error) { clearChunkExport(); return resultError("Could not write the backup chunk. Check free device storage and try again."); }
            }
        }
        @JavascriptInterface public String finishExport(String id) {
            if (!trustedPage) return resultError("Unavailable outside the app.");
            synchronized (transferLock) {
                if (id == null || !id.equals(chunkExportId) || chunkOutput == null) return resultError("The backup export expired.");
                try {
                    chunkOutput.close(); chunkOutput = null;
                    final File staged = chunkExport; final String filename = chunkFilename; final String type = chunkMime;
                    chunkExport = null; chunkExportId = null;
                    runOnUiThread(() -> {
                        if (isFinishing() || isDestroyed()) { staged.delete(); pickerBusy = false; return; }
                        pendingExport = staged; pendingFilename = filename;
                        try { pickerInFlight = true; startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE, filename), EXPORT_FILE); }
                        catch (Exception error) { pickerInFlight = false; pickerBusy = false; clearPendingExport(); pickerError("native-export", "No file picker is available."); }
                    });
                    return "{\"ok\":true}";
                } catch (Exception error) { clearChunkExport(); return resultError("Could not finish staging the backup."); }
            }
        }
        @JavascriptInterface public void abortExport(String id) {
            if (!trustedPage) return;
            synchronized (transferLock) { if (id != null && id.equals(chunkExportId)) clearChunkExport(); }
        }
        @JavascriptInterface public void readImportChunk(String id) {
            if (!trustedPage) return;
            synchronized (transferLock) {
                if (id == null || !id.equals(chunkImportId) || chunkInput == null || importReadPending) return;
                importReadPending = true;
            }
            fileWorker.execute(() -> {
                final FileTransfer.TextChunks source;
                synchronized (transferLock) {
                    if (!id.equals(chunkImportId) || chunkInput == null) return;
                    source = chunkInput;
                }
                try {
                    String text = source.next();
                    synchronized (transferLock) {
                        if (!id.equals(chunkImportId) || source != chunkInput) return;
                        importReadPending = false;
                        event("native-import-chunk", new JSONObject().put("ok", true).put("id", id).put("text", text == null ? "" : text).put("done", text == null));
                        if (text == null) clearChunkImport();
                    }
                } catch (Exception error) {
                    synchronized (transferLock) {
                        if (!id.equals(chunkImportId) || source != chunkInput) return;
                        clearChunkImport();
                        try { event("native-import-chunk", new JSONObject().put("ok", false).put("id", id).put("error", "Could not read this backup. Choose a valid UTF-8 backup file.")); }
                        catch (Exception ignored) { }
                    }
                }
            });
        }
        @JavascriptInterface public void abortImport(String id) {
            if (!trustedPage) return;
            synchronized (transferLock) { if (id != null && id.equals(chunkImportId)) clearChunkImport(); }
        }
        @JavascriptInterface public void exportFile(String filename, String mimeType, String encoded) {
            if (!trustedPage) return;
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
                                try { pickerInFlight = true; startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE, safeName), EXPORT_FILE); }
                                catch (Exception e) { pickerInFlight = false; pickerBusy = false; clearPendingExport(); pickerError("native-export", "No file picker is available."); }
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
    private void completeAi(String id, AiClient.Cancellation token, boolean ok, String value, boolean truncated) {
        synchronized (aiLock) {
            if (activeAi != token) return;
            activeAi = null; activeAiId = null;
        }
        aiResult(id, ok, value, truncated);
    }
    private void cancelActiveAi(String requestedId, boolean notify) {
        String id; AiClient.Cancellation token;
        synchronized (aiLock) {
            if (activeAi == null || (requestedId != null && !requestedId.equals(activeAiId))) return;
            token = activeAi; id = activeAiId; activeAi = null; activeAiId = null;
        }
        token.cancel();
        runOnUiThread(() -> { if (aiConsent != null && id.equals(aiConsentId)) { aiConsent.dismiss(); aiConsent = null; aiConsentId = null; } });
        if (notify) aiResult(id, false, "Request canceled. The provider may still process or charge for a request already sent.");
    }
    private static String safeFilename(String filename) {
        String safe = (filename == null ? "spencerian-export" : filename).replaceAll("[^A-Za-z0-9._-]", "_");
        if (safe.isEmpty() || safe.length() > 120) throw new IllegalArgumentException("Invalid filename.");
        return safe;
    }
    private static String safeMime(String type) {
        return type != null && type.matches("(application/(json|x-ndjson|pdf|octet-stream)|text/(plain|csv)|image/(png|jpeg|svg\\+xml))") ? type : "application/octet-stream";
    }
    private void clearChunkExport() {
        try { if (chunkOutput != null) chunkOutput.close(); } catch (Exception ignored) { }
        if (chunkExport != null) chunkExport.delete();
        chunkOutput = null; chunkExport = null; chunkExportId = null; chunkBytes = 0; pickerBusy = false;
    }
    private void clearChunkImport() {
        final FileTransfer.TextChunks closing = chunkInput;
        chunkInput = null; chunkImportId = null; importReadPending = false; pickerBusy = false;
        // A cloud document provider can block read/close. Never hold transferLock
        // during provider I/O or make Activity teardown wait for that operation.
        if (closing != null) closeWorker.execute(() -> { try { closing.close(); } catch (Exception ignored) { } });
    }
    private static String resultError(String message) { try { return new JSONObject().put("ok", false).put("error", message).toString(); } catch (Exception e) { return "{\"ok\":false}"; } }
    private void launchPicker(int requestCode, String type, String name) {
        runOnUiThread(() -> {
            if (pickerBusy) { pickerError(name, "Finish the current file transfer first."); return; }
            pickerBusy = true;
            try { pickerInFlight = true; startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type), requestCode); }
            catch (Exception e) { pickerInFlight = false; pickerBusy = false; pickerError(name, "No file picker is available."); }
        });
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_IMAGE && request != EXPORT_FILE && request != IMPORT_BACKUP && request != IMPORT_STREAM) return;
        pickerInFlight = false;
        // The picker has returned, but a provider may still be copying or
        // decoding bytes. Keep other picker/transfer requests out until it ends.
        pickerBusy = true;
        String name = request == PICK_IMAGE ? "native-image" : request == EXPORT_FILE ? "native-export" : request == IMPORT_STREAM ? "native-import-start" : "native-import";
        if (result != RESULT_OK || data == null || data.getData() == null) { pickerBusy = false; clearPendingExport(); pickerError(name, "Canceled."); return; }
        final Uri uri = data.getData();
        final File exportFile = pendingExport; final String filename = pendingFilename; pendingExport = null;
        fileWorker.execute(() -> {
            try {
                if (request == EXPORT_FILE) {
                    if (exportFile == null) throw new Exception("Export expired");
                    try (InputStream input = new FileInputStream(exportFile); OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                        if (output == null) throw new Exception(); FileTransfer.copyBounded(input, output, FileTransfer.MAX_BACKUP_BYTES);
                    }
                    event(name, new JSONObject().put("ok", true).put("filename", filename));
                } else if (request == PICK_IMAGE) {
                    event(name, new JSONObject().put("ok", true).put("dataUrl", readImage(uri)));
                } else if (request == IMPORT_STREAM) {
                    InputStream input = getContentResolver().openInputStream(uri);
                    if (input == null) throw new java.io.IOException("Could not open backup.");
                    boolean keep;
                    synchronized (transferLock) {
                        keep = trustedPage && web != null && !destroying && !isDestroyed();
                        if (keep) {
                            chunkInput = new FileTransfer.TextChunks(input, FileTransfer.MAX_BACKUP_BYTES);
                            chunkImportId = UUID.randomUUID().toString();
                            event(name, new JSONObject().put("ok", true).put("id", chunkImportId));
                        }
                    }
                    if (!keep) input.close();
                } else {
                    String text;
                    try (InputStream input = getContentResolver().openInputStream(uri)) { if (input == null) throw new Exception(); text = FileTransfer.readUtf8Bounded(input, FileTransfer.MAX_FILE_BYTES); }
                    // Validation of schema and user choice belongs to the local app; no automatic merge here.
                    event(name, new JSONObject().put("ok", true).put("text", text));
                }
            } catch (Exception e) {
                if (request == EXPORT_FILE) deleteFailedDocument(uri);
                pickerError(name, request == PICK_IMAGE ? "Could not load this image. Choose a JPEG or PNG file." : "Could not read or save this file. Check free storage and try again.");
            }
            finally {
                if (request != IMPORT_STREAM || chunkInput == null) pickerBusy = false;
                if (exportFile != null) exportFile.delete();
            }
        });
    }
    private void clearPendingExport() { if (pendingExport != null) { pendingExport.delete(); pendingExport = null; } }
    private void deleteFailedDocument(Uri uri) {
        try { if (DocumentsContract.isDocumentUri(this, uri)) DocumentsContract.deleteDocument(getContentResolver(), uri); }
        catch (Exception ignored) { /* Some providers do not support deleting an unsuccessful creation. */ }
    }
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
    private void updateBackCallback(boolean enabled) {
        if (Build.VERSION.SDK_INT < 33 || backCallback == null || enabled == backRegistered) return;
        BackApi33.setEnabled(this, backCallback, enabled);
        backRegistered = enabled;
    }
    /** Keep API-33 callback types out of the Activity's field signatures on API 26. */
    private static final class BackApi33 {
        static Object create(Runnable action) { return (OnBackInvokedCallback) action::run; }
        static void setEnabled(Activity activity, Object callback, boolean enabled) {
            if (enabled) activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, (OnBackInvokedCallback) callback);
            else activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) callback);
        }
    }
    private void dispatchBack() {
        if (web != null && trustedPage && pageReady) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-back'));", null);
        else finish();
    }
    @Override public void onBackPressed() { dispatchBack(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        state.putBoolean("pickerInFlight", pickerInFlight);
        if (pendingExport != null) {
            state.putString("pendingExport", pendingExport.getName());
            state.putString("pendingFilename", pendingFilename);
        }
        super.onSaveInstanceState(state);
    }
    @Override protected void onPause() {
        if (web != null) {
            if (trustedPage && pageReady) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-pause'));", null);
            web.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }
    @Override protected void onDestroy() {
        destroying = true; trustedPage = false;
        updateBackCallback(false);
        cancelActiveAi(null, false);
        worker.shutdownNow();
        synchronized (transferLock) { clearChunkExport(); clearChunkImport(); }
        fileWorker.shutdown();
        closeWorker.shutdown();
        // The system may destroy this Activity while its document picker remains
        // open. Its private staged file must survive for the restored result.
        if (isFinishing()) clearPendingExport();
        trustedPage = false; pageReady = false; pendingEvents.clear();
        WebView previous = web;
        web = null;
        disposeWebView(previous);
        super.onDestroy();
    }
}
