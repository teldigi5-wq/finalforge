const C='finalforge-v5-firebase-live-13';
const CORE=['./','./index.html','./assets/core-loader.js','./assets/ui-responsive-v2.css','./assets/auth-experience-v4.css','./assets/auth-experience-v4.js','./assets/auth-premium-v5.css','./assets/auth-premium-v5.js','./assets/dashboard-modern-v3.css','./assets/mobile-modern-v4.css','./assets/mobile-experience-v4.js','./assets/product-ui-v4.css','./assets/product-ui-v4.js','./assets/product-ui-v5.css','./assets/product-motion-v5.js','./assets/tailwind.generated.css','./assets/tailwind-runtime-v6.js','./assets/core/chunk-00.txt','./assets/core/chunk-01.txt','./assets/core/chunk-02.txt','./assets/core/chunk-03.txt','./assets/core/chunk-04.txt','./assets/core/chunk-05a.txt','./assets/core/chunk-05b.txt','./assets/core/chunk-05c.txt','./assets/core/chunk-05d.txt','./assets/core/chunk-06.txt','./assets/app.js','./assets/practice-v3.js','./assets/practice-runtime-bridge.js','./assets/firebase-config.js','./assets/auth.js','./assets/finalforge-logo-256.webp','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
const INSTANT=new Set(['/','/index.html','/assets/core-loader.js','/assets/ui-responsive-v2.css','/assets/auth-experience-v4.css','/assets/auth-experience-v4.js','/assets/auth-premium-v5.css','/assets/auth-premium-v5.js','/assets/dashboard-modern-v3.css','/assets/mobile-modern-v4.css','/assets/mobile-experience-v4.js','/assets/product-ui-v4.css','/assets/product-ui-v4.js','/assets/product-ui-v5.css','/assets/product-motion-v5.js','/assets/tailwind.generated.css','/assets/tailwind-runtime-v6.js','/assets/practice-v3.js','/assets/practice-runtime-bridge.js','/assets/firebase-config.js','/assets/auth.js','/assets/finalforge-logo-256.webp']);

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

async function staleWhileRevalidate(request, fallback){
  const cache=await caches.open(C);
  const cached=await cache.match(request) || (fallback?await cache.match(fallback):null);
  const network=fetch(request).then(res=>{
    if(res&&res.ok)cache.put(request,res.clone());
    return res;
  }).catch(()=>null);
  if(cached){network.catch(()=>{});return cached;}
  const fresh=await network;
  if(fresh)return fresh;
  if(fallback){const f=await cache.match(fallback);if(f)return f;}
  return Response.error();
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;

  if(e.request.mode==='navigate'){
    e.respondWith(staleWhileRevalidate(e.request,'./index.html'));
    return;
  }

  if(INSTANT.has(url.pathname)){
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.ok)caches.open(C).then(c=>c.put(e.request,res.clone()));
      return res;
    }))
  );
});
