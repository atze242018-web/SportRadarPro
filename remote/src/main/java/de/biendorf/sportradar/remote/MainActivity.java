package de.biendorf.sportradar.remote;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import android.text.InputType;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends Activity {
 private WebView web;
 private LinearLayout container,content;
 private TextView status;
 private SharedPreferences prefs;
 private boolean attempted=false;
 private String base;
 private static final String ALIAS="SportRadarPairingV1";
 private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
 private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.WHITE);t.setPadding(0,dp(10),0,dp(8));return t;}
 @Override public void onCreate(Bundle saved){super.onCreate(saved);prefs=getSharedPreferences("connection",MODE_PRIVATE);
 container=new LinearLayout(this);container.setOrientation(LinearLayout.VERTICAL);container.setBackgroundColor(Color.rgb(13,23,39));
 container.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);return insets;});
 container.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
 setContentView(container);container.requestApplyInsets();
 LinearLayout toolbar=new LinearLayout(this);Button reload=new Button(this);reload.setText("Neu laden");reload.setOnClickListener(v->open());Button settings=new Button(this);settings.setText("Verbindung");settings.setOnClickListener(v->settings());toolbar.addView(reload);toolbar.addView(settings);container.addView(toolbar);
 status=text("SportRadar Mobil",12);status.setPadding(dp(12),0,dp(12),dp(4));container.addView(status);
 content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);container.addView(content,new LinearLayout.LayoutParams(-1,0,1));
 if(prefs.contains("host"))open();else settings();
 }
 private String address(String host){
  String[] p=host.trim().split("\\.",-1);if(p.length!=4)return null;int[] n=new int[4];for(int i=0;i<4;i++){if(!p[i].matches("[0-9]{1,3}"))return null;n[i]=Integer.parseInt(p[i]);if(n[i]>255)return null;}
  if(!(n[0]==10||n[0]==192&&n[1]==168||n[0]==172&&n[1]>=16&&n[1]<=31))return null;
  return "http://"+n[0]+"."+n[1]+"."+n[2]+"."+n[3]+":8765";
 }
 private SecretKey key() throws Exception {KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(ks.containsAlias(ALIAS))return (SecretKey)ks.getKey(ALIAS,null);KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return g.generateKey();}
 private String encrypt(String code) throws Exception {Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());return Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(code.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);}
 private String savedCode() throws Exception {String value=prefs.getString("code","");if(value.isEmpty())return "";String[] parts=value.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));return new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);}
 private void settings(){
  if(web!=null){web.stopLoading();web.destroy();web=null;}content.removeAllViews();status.setText("Verbindung einrichten");
  ScrollView scroll=new ScrollView(this);LinearLayout form=new LinearLayout(this);form.setOrientation(LinearLayout.VERTICAL);form.setPadding(dp(20),dp(10),dp(20),dp(20));scroll.addView(form);content.addView(scroll);
  form.addView(text("Dein Sport Radar",27));form.addView(text("Zuhause per WLAN, unterwegs mit eingeschaltetem WireGuard. Laptop und Sport Radar müssen laufen.",16));
  form.addView(text("Laptop-IP-Adresse",14));EditText host=new EditText(this);host.setSingleLine();host.setTextColor(Color.WHITE);host.setInputType(InputType.TYPE_CLASS_PHONE);host.setText(prefs.getString("host","192.168.178.151"));form.addView(host);
  form.addView(text("Achtstelliger Kopplungscode",14));EditText code=new EditText(this);code.setTextColor(Color.WHITE);code.setSingleLine();code.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_VARIATION_PASSWORD);form.addView(code);
  boolean has=prefs.contains("code");form.addView(text(has?"Code bereits verschlüsselt gespeichert. Feld leer lassen, um ihn weiterzuverwenden.":"Code am Laptop unter „Handy verbinden“ ablesen. Er wird verschlüsselt auf diesem Handy gespeichert.",14));
  Button connect=new Button(this);connect.setText("Speichern und verbinden");form.addView(connect);connect.setOnClickListener(v->{String h=host.getText().toString().trim(),c=code.getText().toString().trim();String url=address(h);if(url==null){status.setText("Bitte eine private IPv4-Adresse ohne Port eingeben.");return;}
   if(!c.isEmpty()&&!c.matches("[0-9]{8}")){status.setText("Der Code muss genau acht Ziffern enthalten.");return;}
   boolean changed=!h.equals(prefs.getString("host",""));if(c.isEmpty()&&(!has||changed)){status.setText("Bitte den Kopplungscode für diesen Laptop eingeben.");return;}
   try{SharedPreferences.Editor edit=prefs.edit().putString("host",h);if(!c.isEmpty())edit.putString("code",encrypt(c));if(!edit.commit())throw new Exception();if(changed)CookieManager.getInstance().removeAllCookies(ok->open());else open();}catch(Exception e){status.setText("Code konnte nicht gespeichert werden. Bitte erneut eingeben.");}
  });
  Button forget=new Button(this);forget.setText("Gespeicherte Kopplung löschen");form.addView(forget);forget.setOnClickListener(v->new AlertDialog.Builder(this).setMessage("Code und Sitzung auf diesem Handy löschen?").setNegativeButton("Abbrechen",null).setPositiveButton("Löschen",(d,w)->{prefs.edit().remove("code").apply();CookieManager.getInstance().removeAllCookies(ok->{CookieManager.getInstance().flush();settings();});}).show());
 }
 private boolean internal(Uri u){return base!=null&&"http".equals(u.getScheme())&&u.getUserInfo()==null&&u.getPort()==8765&&Uri.parse(base).getHost().equals(u.getHost());}
 @android.annotation.SuppressLint("SetJavaScriptEnabled")
 private void open(){base=address(prefs.getString("host",""));if(base==null){settings();return;}if(web!=null){web.destroy();web=null;}content.removeAllViews();attempted=false;
  web=new WebView(this);content.addView(web,new LinearLayout.LayoutParams(-1,-1));web.setBackgroundColor(Color.rgb(13,23,39));web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){if(internal(r.getUrl()))return false;status.setText("Externer Link bleibt in dieser App gesperrt.");return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){if(internal(r.getUrl()))return null;return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));}
   @Override public void onPageFinished(WebView v,String url){if(!internal(Uri.parse(url)))return;CookieManager.getInstance().flush();if("/pair".equals(Uri.parse(url).getPath())){if(!attempted){attempted=true;try{String c=savedCode();if(c.matches("[0-9]{8}")){status.setText("Gespeicherte Kopplung wird verwendet …");pairSavedCode(v,c);return;}}catch(Exception e){status.setText("Gespeicherten Code bitte unter Verbindung erneuern.");return;}}
    status.setText("Kopplung nicht bestätigt. Code unter Verbindung prüfen.");
   }else status.setText("SportRadar · Daten vom Laptop");}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("Laptop nicht erreichbar. WireGuard, Laptop und SportRadar prüfen. Dann Neu laden.");}
  });web.loadUrl(base+"/");
 }
 private void pairSavedCode(WebView target,String code){
  final String origin=base;
  new Thread(()->{try{
   String cookie=PairingClient.pair(origin,code);
   runOnUiThread(()->{if(web!=target||!origin.equals(base))return;
    CookieManager.getInstance().setCookie(origin,cookie,ok->{if(web!=target||!origin.equals(base))return;if(Boolean.TRUE.equals(ok)){CookieManager.getInstance().flush();target.loadUrl(origin+"/");}else status.setText("Sitzung konnte nicht gespeichert werden.");});
   });
  }catch(Exception e){runOnUiThread(()->{if(web==target&&origin.equals(base))status.setText(e.getMessage()==null?"Kopplung fehlgeschlagen. Verbindung prüfen.":e.getMessage());});}},"SportRadar-Pairing").start();
 }
 @Override protected void onPause(){CookieManager.getInstance().flush();if(web!=null)web.onPause();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
