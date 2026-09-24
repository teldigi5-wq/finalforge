const C='finalforge-v5-firebase-live-3';
const CORE=['./','./index.html','./assets/core-loader.js','./assets/ui-responsive-v2.css','./assets/core/chunk-00.txt','./assets/core/chunk-01.txt','./assets/core/chunk-02.txt','./assets/core/chunk-03.txt','./assets/core/chunk-04.txt','./assets/core/chunk-05a.txt','./assets/core/chunk-05b.txt','./assets/core/chunk-05c.txt','./assets/core/chunk-05d.txt','./assets/core/chunk-06.txt','./assets/app.js','./assets/practice-v3.js','./assets/firebase-config.js','./assets/auth.js','./assets/finalforge-logo-256.webp','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
const NETWORK_FIRST=new Set(['/','/index.html','/assets/core-loader.js','/assets/ui-responsive-v2.css','/assets/firebase-config.js','/assets/auth.js']);

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;

  if(e.request.mode==='navigate'||NETWORK_FIRST.has(url.pathname)){
    e.respondWith(
      fetch(e.request)
        .then(res=>{
          const copy=res.clone();
          caches.open(C).then(c=>c.put(e.request,copy));
          return res;
        })
        .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(C).then(c=>c.put(e.request,copy));
      return res;
    }))
  );
});
