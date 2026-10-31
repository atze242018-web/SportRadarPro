package de.biendorf.sportradar;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/web/index.html";
    private static final int EXPORT_JSON = 4101, PICK_JSON = 4102;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String exportText;

    private boolean local(String url) {
        if (url == null) return false;
        Uri u = Uri.parse(url);
        return "https".equals(u.getScheme()) && HOST.equals(u.getHost())
                && u.getPort() == -1 && u.getPath() != null && u.getPath().startsWith("/assets/web/");
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(11,17,24));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                android.graphics.Insets ime = insets.getInsets(android.view.WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return insets;
            });
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        web.setBackgroundColor(Color.rgb(11,17,24));
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                if (response != null && request.getUrl().getPath() != null && request.getUrl().getPath().endsWith(".mjs")) response.setMimeType("text/javascript");
                return response;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (local(url)) return false;
                String scheme = request.getUrl().getScheme();
                if (request.isForMainFrame() && ("https".equals(scheme) || "http".equals(scheme))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                    catch (ActivityNotFoundException e) { toast("Kein Browser verfügbar."); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!local(view.getUrl())) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.setType("application/json");
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(pick, PICK_JSON); }
                catch (ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        web.addJavascriptInterface(new ExportBridge(), "SportRadarAndroid");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
        if (state == null || web.restoreState(state) == null) web.loadUrl(START);
    }
    private void goBack() { if (web.canGoBack()) web.goBack(); else finish(); }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { goBack(); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }

    private final class ExportBridge {
        @JavascriptInterface public void exportJson(String filename, String text) {
            runOnUiThread(() -> {
                if (!local(web.getUrl()) || text == null || text.length() > 5_000_000) return;
                try {
                    Object value = new JSONTokener(text).nextValue();
                    if (!(value instanceof JSONObject) && !(value instanceof JSONArray)) return;
                    String clean = filename == null ? "SportRadar_Sicherung.json" : filename.replaceAll("[^a-zA-Z0-9_.-]", "_");
                    if (clean.length() > 100) clean = clean.substring(0,100);
                    if (!clean.endsWith(".json")) clean += ".json";
                    exportText = text;
                    Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    save.setType("application/json");
                    save.addCategory(Intent.CATEGORY_OPENABLE);
                    save.putExtra(Intent.EXTRA_TITLE, clean);
                    startActivityForResult(save, EXPORT_JSON);
                } catch (Exception e) { exportText = null; toast("Sicherung konnte nicht vorbereitet werden."); }
            });
        }
    }
    @SuppressWarnings("deprecation") @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_JSON && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == EXPORT_JSON) {
            if (result == RESULT_OK && data != null && data.getData() != null && exportText != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new IllegalStateException("Kein Ausgabestrom");
                    out.write(exportText.getBytes(StandardCharsets.UTF_8));
                    toast("Sicherung gespeichert.");
                } catch (Exception e) { toast("Sicherung konnte nicht gespeichert werden."); }
            }
            exportText = null;
        }
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        web.removeJavascriptInterface("SportRadarAndroid");
        web.destroy();
        super.onDestroy();
    }
}
