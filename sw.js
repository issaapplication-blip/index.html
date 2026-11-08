/* RAFIQ | رفيق — offline cache for the approved medical-centre directory. */
self.addEventListener("message",function(e){if(e.data&&e.data.type==="SKIP_WAITING")self.skipWaiting();});
var CACHE="rafig-directory-v2-20261108";
var ASSETS=[
 "/","/index.html","/offline.html","/about.html","/services.html","/faq.html","/guide.html",
 "/regions.html","/tripoli.html","/dinniyeh.html","/zgharta.html","/koura.html","/batroun.html",
 "/beirut.html","/lebanon.html","/caregivers.html","/agent.html","/install.html",
 "/manifest.webmanifest","/install-app.js","/css/device.css","/js/locales/ar.js",
 "/assets/rafig-logo.png","/assets/icon-192.png","/assets/icon-512.png",
 "/assets/icon-maskable-512.png","/assets/apple-touch-icon.png"
];
self.addEventListener("install",function(e){
 e.waitUntil(caches.open(CACHE).then(function(c){
  return Promise.all(ASSETS.map(function(u){return c.add(new Request(u,{cache:"reload"})).catch(function(){return null;});}));
 }).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(e){
 e.waitUntil(caches.keys().then(function(keys){
  return Promise.all(keys.map(function(k){return /^(rafig|rafiq)-/i.test(k)&&k!==CACHE?caches.delete(k):null;}));
 }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
 var req=e.request;if(req.method!=="GET")return;
 var url;try{url=new URL(req.url);}catch(_){return;}
 if(url.origin!==self.location.origin)return;
 if(url.pathname.indexOf("/api/")===0||/^\/(?:admin|dashboard|barcode)(?:\.html|\/|$)/i.test(url.pathname))return;
 if(req.mode==="navigate"){
  e.respondWith(fetch(req,{cache:"no-store"}).then(function(res){
   var type=res.headers.get("content-type")||"";
   if(res.ok&&type.indexOf("text/html")!==-1){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);}).catch(function(){});return res;}
   return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||caches.match("/offline.html");});
  }).catch(function(){return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||caches.match("/offline.html").then(function(off){return off||caches.match("/index.html");});});}));
  return;
 }
 e.respondWith(fetch(req,{cache:"no-store"}).then(function(res){
  if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);}).catch(function(){});}
  return res;
 }).catch(function(){return caches.match(req).then(function(c){return c||new Response("unavailable",{status:503});});}));
});
