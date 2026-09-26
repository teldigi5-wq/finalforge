const C='finalforge-v47-professional-workspace';

// Cache the shell and critical runtime at install. Feature assets are cached as requested.
const CORE=[
  './',
  './index.html',
  './verify.html',
  './manifest.webmanifest',
  './assets/core-loader.js',
  './assets/ui-responsive-v2.css',
  './assets/auth-experience-v4.css',
  './assets/experience-v9.css',
  './assets/auth-world-v1.css',
  './assets/theme-coherence-v1.css',
  './assets/responsive-hardening-v2.css',
  './assets/auth-neon-rounded-v1.css',
  './assets/past-papers-v1.css',
  './assets/past-papers-v1.js',
  './assets/student-experience-v2.css',
  './assets/student-experience-v2.js',
  './assets/visual-system-v2.css',
  './assets/mobile-auth-v5.css',
  './assets/mobile-modern-v4.css',
  './assets/runtime-stability-v1.css',
  './assets/mobile-runtime-final-v1.css',
  './assets/mobile-runtime-final-v1.js',
  './assets/mobile-scroll-recovery-v1.css',
  './assets/mobile-scroll-recovery-v1.js',
  './assets/mobile-navigation-runtime-v2.js',
  './assets/practice-stability-v1.js',
  './assets/session-restore-v1.js',
  './assets/signup-fix-v2.js',
  './assets/verification-handoff-v1.js',
  './assets/cloud-ui-stability-v1.js',
  './assets/professional-workspace-v2.css',
  './assets/professional-workspace-v2.js',
  './assets/ux-hardening-v1.js',
  './assets/finalforge-logo.svg',
  './assets/dcn-2024-pattern-v1.js'
];

const INSTANT=new Set([
  '/',
  '/index.html',
  '/verify.html',
  '/manifest.webmanifest',
  '/assets/ui-responsive-v2.css',
  '/assets/auth-experience-v4.css',
  '/assets/auth-experience-v4.js',
  '/assets/auth-world-v1.css',
  '/assets/auth-world-v1.js',
  '/assets/theme-coherence-v1.css',
  '/assets/responsive-hardening-v2.css',
  '/assets/auth-neon-rounded-v1.css',
  '/assets/past-papers-v1.css',
  '/assets/past-papers-v1.js',
  '/assets/student-experience-v2.css',
  '/assets/student-experience-v2.js',
  '/assets/visual-system-v2.css',
  '/assets/mobile-auth-v5.css',
  '/assets/runtime-stability-v1.css',
  '/assets/mobile-runtime-final-v1.css',
  '/assets/mobile-runtime-final-v1.js',
  '/assets/mobile-scroll-recovery-v1.css',
  '/assets/mobile-scroll-recovery-v1.js',
  '/assets/mobile-navigation-runtime-v2.js',
  '/assets/practice-stability-v1.js',
  '/assets/session-restore-v1.js',
  '/assets/signup-fix-v2.js',
  '/assets/verification-handoff-v1.js',
  '/assets/cloud-ui-stability-v1.js',
  '/assets/professional-workspace-v2.css',
  '/assets/professional-workspace-v2.js',
  '/assets/ux-hardening-v1.js',
  '/assets/auth-premium-v5.css',
  '/assets/auth-premium-v5.js',
  '/assets/dashboard-modern-v3.css',
  '/assets/mobile-modern-v4.css',
  '/assets/mobile-experience-v4.js',
  '/assets/product-ui-v4.css',
  '/assets/product-ui-v4.js',
  '/assets/product-ui-v5.css',
  '/assets/product-motion-v5.js',
  '/assets/reference-refresh.css',
  '/assets/reference-enhancements.js',
  '/assets/experience-v9.css',
  '/assets/appearance-v1.js',
  '/assets/practice-exam-v4.js',
  '/assets/dcn-2024-pattern-v1.js',
  '/assets/study-room.webp',
  '/assets/campus-banner.webp',
  '/assets/tailwind.generated.css',
  '/assets/tailwind-runtime-v6.js',
  '/assets/firebase-config.js',
  '/assets/auth.js',
  '/assets/app.js',
  '/assets/finalforge-logo.svg',
  '/assets/finalforge-logo-256.webp',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
]);

const CRITICAL_RUNTIME=new Set([
  '/assets/core-loader.js',
  '/assets/app.js',
  '/assets/auth.js',
  '/assets/session-restore-v1.js',
  '/assets/firebase-config.js',
  '/assets/cloud-ui-stability-v1.js',
  '/assets/mobile-modern-v4.css',
  '/assets/reference-enhancements.js',
  '/assets/runtime-stability-v1.css',
  '/assets/mobile-runtime-final-v1.css',
  '/assets/mobile-runtime-final-v1.js',
  '/assets/mobile-scroll-recovery-v1.css',
  '/assets/mobile-scroll-recovery-v1.js',
  '/assets/mobile-navigation-runtime-v2.js',
  '/assets/practice-stability-v1.js',
  '/assets/practice-exam-v4.js',
  '/assets/professional-workspace-v2.css',
  '/assets/professional-workspace-v2.js'
]);

self.addEventListener('install',event=>event.waitUntil(
  caches.open(C)
    .then(cache=>cache.addAll(CORE))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==C).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

async function staleWhileRevalidate(request,fallback){
  const cache=await caches.open(C);
  const cached=await cache.match(request)||(fallback?await cache.match(fallback):null);
  const network=fetch(request).then(response=>{
    if(response?.ok)cache.put(request,response.clone());
    return response;
  }).catch(()=>null);

  if(cached){
    network.catch(()=>{});
    return cached;
  }
  const fresh=await network;
  if(fresh)return fresh;
  if(fallback){
    const cachedFallback=await cache.match(fallback);
    if(cachedFallback)return cachedFallback;
  }
  return Response.error();
}

async function freshNavigation(request){
  const cache=await caches.open(C);
  try{
    const response=await fetch(request,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
    if(response.ok){
      await cache.put(request,response.clone());
      return response;
    }
  }catch{}
  return await cache.match(request)||await cache.match('./index.html')||Response.error();
}

async function freshRuntime(request){
  const cache=await caches.open(C);
  try{
    const response=await fetch(request,{cache:'no-cache',signal:AbortSignal.timeout(8000)});
    if(response.ok){
      await cache.put(request,response.clone());
      return response;
    }
  }catch{}
  return await cache.match(request)||Response.error();
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(freshNavigation(event.request));
    return;
  }
  if(CRITICAL_RUNTIME.has(url.pathname)){
    event.respondWith(freshRuntime(event.request));
    return;
  }
  if(INSTANT.has(url.pathname)){
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response?.ok)caches.open(C).then(cache=>cache.put(event.request,response.clone()));
      return response;
    }))
  );
});
