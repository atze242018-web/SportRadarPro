import de.biendorf.sportradar.remote.PairingClient;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
public class PairingTest {
 public static void main(String[] args) throws Exception {
  HttpServer s=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);String origin="http://127.0.0.1:"+s.getAddress().getPort();
  s.createContext("/pair",e->{String body=new String(e.getRequestBody().readAllBytes());boolean ok=origin.equals(e.getRequestHeaders().getFirst("Origin"))&&body.equals("code=12345678")&&e.getRequestMethod().equals("POST")&&"application/x-www-form-urlencoded".equals(e.getRequestHeaders().getFirst("Content-Type"));
   if(ok){e.getResponseHeaders().add("Set-Cookie","sportradar_lan="+"a".repeat(64)+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000");e.getResponseHeaders().add("Location","/");}e.sendResponseHeaders(ok?303:403,-1);e.close();});s.start();
  try{
   String cookie=PairingClient.pair(origin,"12345678");if(!cookie.startsWith("sportradar_lan="))throw new AssertionError();
   try{PairingClient.pair(origin,"00000000");throw new AssertionError("Wrong code accepted");}catch(java.io.IOException expected){}
   try{PairingClient.pair(origin,"123\r\n");throw new AssertionError("Invalid code accepted");}catch(java.io.IOException expected){}
   System.out.println("PASS: same-origin POST with exact form body; successful cookie; wrong and malformed code rejected");
  }finally{s.stop(0);}
 }
}
