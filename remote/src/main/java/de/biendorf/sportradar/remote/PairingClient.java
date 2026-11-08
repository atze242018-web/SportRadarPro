package de.biendorf.sportradar.remote;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Native pairing POST; preserves the server's existing same-origin protection. */
public final class PairingClient {
 private PairingClient() {}
 public static String pair(String origin,String code) throws IOException {
  if(code==null||!code.matches("[0-9]{8}"))throw new IOException("Kopplungscode muss acht Ziffern enthalten.");
  HttpURLConnection c=(HttpURLConnection)new URL(origin+"/pair").openConnection();
  try {
   c.setConnectTimeout(8000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);
   c.setRequestMethod("POST");c.setRequestProperty("Origin",origin);
   c.setRequestProperty("Content-Type","application/x-www-form-urlencoded");c.setDoOutput(true);
   byte[] body=("code="+code).getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(body.length);
   try(java.io.OutputStream out=c.getOutputStream()){out.write(body);}
   int status=c.getResponseCode();
   if(status==429)throw new IOException("Zu viele Versuche. Bitte fünf Minuten warten.");
   if(status!=303||!"/".equals(c.getHeaderField("Location")))throw new IOException("Kopplung abgelehnt (HTTP "+status+"). Code unter Verbindung prüfen.");
   for(Map.Entry<String,List<String>> entry:c.getHeaderFields().entrySet()){
    if(entry.getKey()!=null&&entry.getKey().equalsIgnoreCase("Set-Cookie"))for(String cookie:entry.getValue()){
     if(cookie.matches("sportradar_lan=[a-f0-9]{64};.*"))return cookie;
    }
   }
   throw new IOException("Kopplung lieferte keine gültige Sitzung.");
  }finally{c.disconnect();}
 }
}
