const CACHE="korak-v14-2026-10";
const FILES=["./","./index.html","./styles.css","./config.js","./cloud.js","./app.js","./account.js","./social.js","./dictionary.js","./vala.js","./coast.js","./sound.js","./course/a1.js","./course/a2.js","./course/b1.js","./course-data.js","./culture-data.js","./exercise-data.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const req=e.request,url=new URL(req.url);
  // Konto- und Fortschrittsdaten (Supabase) nie aus dem Cache bedienen – sonst käme veralteter Fortschritt zurück.
  if(req.method!=="GET"||url.hostname.endsWith(".supabase.co")||url.pathname.startsWith("/auth/v1/")||url.pathname.startsWith("/rest/v1/"))return;
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(resp=>{if(resp.ok||resp.type==="opaque"){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return resp}).catch(()=>req.mode==="navigate"?caches.match("./index.html"):Response.error())));
});
