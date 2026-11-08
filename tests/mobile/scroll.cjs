const {chromium}=require('playwright');
const fs=require('node:fs');
const http=require('node:http');
const assert=require('node:assert/strict');
(async()=>{
 const css='@media(max-width:650px){html,body{height:100%;height:100dvh;overflow:hidden}.main-shell{height:100%;overflow-y:auto}}';
 const server=http.createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'");if(req.url==='/test.css'){res.setHeader('Content-Type','text/css');res.end(css);}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><main class="sr-main">'+Array.from({length:60},(_,i)=>'<p>Spiel '+i+'</p>').join('')+'<button id="bottom">Seitenende</button></main>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:393,height:700},isMobile:true,hasTouch:true});await page.goto('http://127.0.0.1:'+server.address().port);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
 await page.evaluate(fs.readFileSync('remote/src/main/assets/mobile-scroll.js','utf8'));
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'auto');
 await page.evaluate(()=>window.scrollTo(0,800));assert.ok(await page.evaluate(()=>window.scrollY)>500);
 await page.locator('#bottom').scrollIntoViewIfNeeded();assert.ok(await page.locator('#bottom').isVisible());
 // A native mobile WebView scroll gesture is a touch move through Chromium.
 const client=await page.context().newCDPSession(page);await page.evaluate(()=>window.scrollTo(0,0));
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:570}]});
 for(let y=540;y>=150;y-=30){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});await new Promise(r=>setTimeout(r,20));}
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await new Promise(r=>setTimeout(r,150));
 assert.ok(await page.evaluate(()=>window.scrollY)>100,'Touch swipe must scroll');
 console.log('PASS: document scrolling and touch swipe work with original overflow lock and strict CSP');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
