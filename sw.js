const C='finalforge-2026-v5';
const CORE=['./','./index.html','./assets/core-loader.js','./assets/core.bundle.gz','./assets/app.js','./assets/firebase-config.js','./assets/auth.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(C))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{let cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):undefined)))});
