const C='finalforge-v12-theme-coherence';
// Cache the shell at install; feature assets are cached as the page requests them.
const CORE=['./','./index.html','./assets/core-loader.js','./assets/ui-responsive-v2.css','./assets/auth-experience-v4.css','./assets/experience-v9.css','./assets/auth-world-v1.css','./assets/theme-coherence-v1.css','./assets/finalforge-logo.svg'];
const INSTANT=new Set(['/','/index.html','/assets/core-loader.js','/assets/ui-responsive-v2.css','/assets/auth-experience-v4.css','/assets/auth-experience-v4.js','/assets/auth-world-v1.css','/assets/auth-world-v1.js','/assets/theme-coherence-v1.css','/assets/auth-premium-v5.css','/assets/auth-premium-v5.js','/assets/dashboard-modern-v3.css','/assets/mobile-modern-v4.css','/assets/mobile-experience-v4.js','/assets/product-ui-v4.css','/assets/product-ui-v4.js','/assets/product-ui-v5.css','/assets/product-motion-v5.js','/assets/reference-refresh.css','/assets/reference-enhancements.js','/assets/experience-v9.css','/assets/appearance-v1.js','/assets/practice-exam-v4.js','/assets/study-room.webp','/assets/campus-banner.webp','/assets/tailwind.generated.css','/assets/tailwind-runtime-v6.js','/assets/firebase-config.js','/assets/auth.js','/assets/finalforge-logo.svg','/assets/finalforge-logo-256.webp','/assets/icon-192.png','/assets/icon-512.png']);

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

async function freshNavigation(request){
  const cache=await caches.open(C);
  try{
    const response=await fetch(request,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
    if(response.ok){await cache.put(request,response.clone());return response;}
  }catch{}
  return await cache.match(request)||await cache.match('./index.html')||Response.error();
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;

  if(e.request.mode==='navigate'){
    e.respondWith(freshNavigation(e.request));
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
