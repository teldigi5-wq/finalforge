const C='finalforge-v54-workspace-v3';

const CORE=[
  './','./index.html','./verify.html','./manifest.webmanifest',
  './assets/core-loader.js','./assets/account-storage-v1.js','./assets/resource-delivery-v1.js',
  './assets/app.js','./assets/past-papers-v1.js','./assets/appearance-v1.js','./assets/theme-toggle-stability-v1.js',
  './assets/practice-exam-v4.js','./assets/ip-paper-extension-v1.js','./assets/ip-challenge-v2.js','./assets/study-experience.js','./assets/stability-runtime-v1.js',
  './assets/premium-ui-v1.js','./assets/workspace-v3.js','./assets/mobile-runtime-final-v1.js','./assets/auth.js','./assets/practice-stability-v1.js',
  './assets/mobile-navigation-runtime-v2.js','./assets/mobile-scroll-recovery-v1.js',
  './assets/auth-system-v2.css','./assets/auth-responsive-hotfix-v1.css','./assets/stability-mode-v1.css','./assets/premium-shell-v1.css','./assets/workspace-v3.css',
  './assets/finalforge-logo.svg'
];

const CRITICAL_RUNTIME=new Set([
  '/assets/core-loader.js','/assets/account-storage-v1.js','/assets/resource-delivery-v1.js','/assets/app.js',
  '/assets/past-papers-v1.js','/assets/appearance-v1.js','/assets/theme-toggle-stability-v1.js',
  '/assets/practice-exam-v4.js','/assets/ip-paper-extension-v1.js','/assets/ip-challenge-v2.js','/assets/study-experience.js','/assets/stability-runtime-v1.js',
  '/assets/premium-ui-v1.js','/assets/workspace-v3.js','/assets/mobile-runtime-final-v1.js','/assets/auth.js','/assets/practice-stability-v1.js',
  '/assets/mobile-navigation-runtime-v2.js','/assets/mobile-scroll-recovery-v1.js',
  '/assets/auth-system-v2.css','/assets/auth-responsive-hotfix-v1.css','/assets/stability-mode-v1.css','/assets/premium-shell-v1.css','/assets/workspace-v3.css'
]);

self.addEventListener('install',event=>event.waitUntil(
  caches.open(C).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==C).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

function protectedPath(pathname){return pathname.startsWith('/api/')||pathname.startsWith('/resource/')}
function cacheable(response){
  if(!response?.ok)return false;
  const control=response.headers?.get?.('Cache-Control')||'';
  return !/(?:no-store|private)/i.test(control);
}
function fetchOptions(){
  const options={cache:'no-cache'};
  if(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function')options.signal=AbortSignal.timeout(8000);
  return options;
}

async function fresh(request,fallback){
  const cache=await caches.open(C);
  try{
    const response=await fetch(request,fetchOptions());
    if(cacheable(response))await cache.put(request,response.clone());
    return response;
  }catch{
    return await cache.match(request)||await cache.match(fallback||'./index.html')||Response.error();
  }
}

async function cachedThenNetwork(request){
  const cache=await caches.open(C);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(cacheable(response))cache.put(request,response.clone());
    return response;
  }catch{return Response.error()}
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(protectedPath(url.pathname)){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fresh(event.request,'./index.html'));
    return;
  }
  if(CRITICAL_RUNTIME.has(url.pathname)){
    event.respondWith(fresh(event.request));
    return;
  }
  event.respondWith(cachedThenNetwork(event.request));
});