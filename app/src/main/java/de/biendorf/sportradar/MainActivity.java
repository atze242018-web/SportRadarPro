package de.biendorf.sportradar;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Rect;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
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
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Set;
import java.util.Map;
import java.util.Iterator;
import java.util.Arrays;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/web/index.html";
    private static final int EXPORT_JSON = 4101, PICK_JSON = 4102, PICK_QUOTE_IMAGE = 4103;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String exportText;
    private TextRecognizer quoteRecognizer;
    private boolean quoteBusy;
    private final ExecutorService tipicoExecutor = Executors.newFixedThreadPool(2);
    private final Map<String, String> tipicoCache = new ConcurrentHashMap<>();
    private final Map<String, Long> tipicoCacheTime = new ConcurrentHashMap<>();
    private final Set<String> tipicoRunning = ConcurrentHashMap.newKeySet();
    private final Set<String> tipicoSports = new HashSet<>(Arrays.asList("soccer", "basketball", "football", "baseball", "tennis"));
    private void tipicoEvent(String requestId, String sport) {
        JSONObject payload = new JSONObject();
        HttpURLConnection connection = null;
        try {
            payload.put("requestId", requestId);
            long fetched = tipicoCacheTime.getOrDefault(sport, 0L);
            String raw = tipicoCache.get(sport);
            if (raw == null || System.currentTimeMillis() - fetched >= 30_000) {
                URL url = new URL("https://sports.tipico.de/v1/tpapi/programgateway/program/events/hourEvents/48?language=de&maxMarkets=1&selectedSports=" + sport);
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setRequestMethod("GET"); connection.setConnectTimeout(8000); connection.setReadTimeout(12000);
                connection.setUseCaches(false); connection.setRequestProperty("Accept", "application/json");
                int status = connection.getResponseCode();
                if (status != 200) throw new IllegalStateException("Tipico antwortet mit HTTP " + status + ". Keine Quoten übernommen.");
                String type = connection.getContentType();
                if (type == null || !type.toLowerCase(java.util.Locale.ROOT).contains("json")) throw new IllegalStateException("Tipico liefert keine Quotendaten.");
                try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = in.read(buffer)) != -1) {
                        if (out.size() + n > 4_000_000) throw new IllegalStateException("Tipico-Antwort zu groß.");
                        out.write(buffer, 0, n);
                    }
                    JSONObject all = new JSONObject(out.toString("UTF-8"));
                    JSONObject upcoming = all.getJSONObject("UPCOMING");
                    JSONObject clean = new JSONObject();
                    JSONObject events = upcoming.getJSONObject("events"), reduced = new JSONObject();
                    Iterator<String> ids = events.keys();
                    while (ids.hasNext()) {
                        String id = ids.next(); JSONObject event = events.getJSONObject(id), fields = new JSONObject();
                        for (String field : new String[]{"id", "team1", "team2", "status", "eventStartTime"}) fields.put(field, event.opt(field));
                        reduced.put(id, fields);
                    }
                    clean.put("events", reduced);
                    for (String field : new String[]{"matchOddGroups", "source", "live"}) clean.put(field, upcoming.get(field));
                    raw = new JSONObject().put("UPCOMING", clean).toString();
                    if (raw.length() > 400_000) throw new IllegalStateException("Tipico-Programm zu groß für die sichere App-Übertragung.");
                }
                fetched = System.currentTimeMillis(); tipicoCache.put(sport, raw); tipicoCacheTime.put(sport, fetched);
            }
            payload.put("data", new JSONObject(raw)); payload.put("fetchedAt", fetched);
        } catch (Exception e) {
            try { payload.put("error", e instanceof IllegalStateException ? e.getMessage() : "Tipico-Verbindung fehlgeschlagen. Bitte später erneut versuchen."); }
            catch (Exception ignored) { }
        } finally {
            if (connection != null) connection.disconnect(); tipicoRunning.remove(sport);
        }
        runOnUiThread(() -> {
            if (!isFinishing() && !isDestroyed() && local(web.getUrl())) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('tipico-program',{detail:" + payload.toString() + "}));", null);
        });
    }

    private void quoteEvent(JSONObject payload) {
        if (isFinishing() || isDestroyed() || !local(web.getUrl())) return;
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('tipico-ocr',{detail:" + payload.toString() + "}));", null);
    }
    private void quoteError(String error) {
        quoteBusy = false;
        try { JSONObject payload = new JSONObject(); payload.put("error", error); quoteEvent(payload); }
        catch (Exception ignored) { toast(error); }
    }
    private void readQuoteImage(Uri uri) {
        try {
            InputImage image = InputImage.fromFilePath(this, uri);
            if ((long) image.getWidth() * image.getHeight() > 24_000_000L) {
                quoteError("Bild zu groß. Bitte einen normalen Screenshot auswählen."); return;
            }
            if (quoteRecognizer == null) quoteRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            quoteRecognizer.process(image).addOnSuccessListener(result -> {
                quoteBusy = false;
                try {
                    JSONObject payload = new JSONObject();
                    String raw = result.getText();
                    if (raw.length() > 60_000) { quoteError("Zu viel Text. Bitte den Wettschein enger zuschneiden."); return; }
                    payload.put("text", raw);
                    JSONArray lines = new JSONArray();
                    for (Text.TextBlock block : result.getTextBlocks()) for (Text.Line line : block.getLines()) {
                        Rect box = line.getBoundingBox();
                        if (box == null || lines.length() >= 3000) continue;
                        JSONObject item = new JSONObject();
                        item.put("text", line.getText()); item.put("x", box.left); item.put("y", box.top);
                        item.put("w", box.width()); item.put("h", box.height()); lines.put(item);
                    }
                    payload.put("lines", lines); quoteEvent(payload);
                } catch (Exception e) { quoteError("Bildtext konnte nicht verarbeitet werden."); }
            }).addOnFailureListener(error -> quoteError("Screenshot konnte nicht gelesen werden. Bitte ein scharfes Bild auswählen."));
        } catch (Exception e) { quoteError("Bild konnte nicht geöffnet werden."); }
    }

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
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
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
        @JavascriptInterface public void readTipicoProgram(String sport, String requestId) {
            runOnUiThread(() -> {
                if (!local(web.getUrl()) || sport == null || requestId == null || !tipicoSports.contains(sport)
                        || !requestId.matches("[a-zA-Z0-9-]{1,64}") || !tipicoRunning.add(sport)) return;
                tipicoExecutor.execute(() -> tipicoEvent(requestId, sport));
            });
        }
        @JavascriptInterface public void importTipicoScreenshot() {
            runOnUiThread(() -> {
                if (!local(web.getUrl()) || quoteBusy) return;
                quoteBusy = true;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.setType("image/*"); pick.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(pick, PICK_QUOTE_IMAGE); }
                catch (ActivityNotFoundException e) { quoteError("Keine Bildauswahl verfügbar."); }
            });
        }
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
        if (request == PICK_QUOTE_IMAGE) {
            if (result == RESULT_OK && data != null && data.getData() != null) readQuoteImage(data.getData());
            else quoteError("Screenshot-Auswahl abgebrochen.");
        }
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
        tipicoExecutor.shutdownNow();
        if (quoteRecognizer != null) quoteRecognizer.close();
        web.removeJavascriptInterface("SportRadarAndroid");
        web.destroy();
        super.onDestroy();
    }
}
