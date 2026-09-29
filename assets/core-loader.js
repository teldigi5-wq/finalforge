/* FinalForge production loader — stability-first premium workspace runtime. */
try{
  const saved=localStorage.getItem('finalforge_theme_v1');
  const initial=saved==='light'||saved==='dark'?saved:'dark';
  document.documentElement.dataset.theme=initial;
  document.documentElement.style.background=initial==='dark'?'#07111f':'#f4f7fb';
  document.documentElement.style.colorScheme=initial;
}catch{
  document.documentElement.style.background='#07111f';
  document.documentElement.style.colorScheme='dark';
}

document.documentElement.classList.add('ff-auth-restoring','ff-stability-mode');
(()=>{
  const style=document.createElement('style');
  style.id='ff-session-restore-critical';
  style.textContent=`
    html.ff-auth-restoring body.auth-pending .auth-shell,
    body.auth-pending #authGate[data-auth-state='initializing'] .auth-shell,
    body.auth-pending #authGate[data-auth-state='authenticating'] .auth-shell{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
    html.ff-auth-restoring body.auth-pending #authGate,
    body.auth-pending #authGate[data-auth-state='initializing'],
    body.auth-pending #authGate[data-auth-state='authenticating']{display:grid!important;place-items:center!important}
    html.ff-auth-restoring body.auth-pending #authGate::before,
    body.auth-pending #authGate[data-auth-state='initializing']::before,
    body.auth-pending #authGate[data-auth-state='authenticating']::before{content:''!important;position:fixed!important;z-index:80!important;left:50%!important;top:calc(50% - 30px)!important;width:34px!important;height:34px!important;margin:-17px 0 0 -17px!important;border:2px solid rgba(91,157,255,.18)!important;border-top-color:#5b9dff!important;border-radius:50%!important;animation:ffRestoreSpin .8s linear infinite!important;pointer-events:none!important}
    html.ff-auth-restoring body.auth-pending #authGate::after,
    body.auth-pending #authGate[data-auth-state='initializing']::after,
    body.auth-pending #authGate[data-auth-state='authenticating']::after{content:'Restoring your secure session…'!important;position:fixed!important;z-index:80!important;left:50%!important;top:calc(50% + 30px)!important;transform:translate(-50%,-50%)!important;padding:.72rem .95rem!important;border:1px solid rgba(120,158,213,.18)!important;border-radius:12px!important;background:rgba(8,18,33,.92)!important;color:#dce9f8!important;box-shadow:0 18px 55px rgba(0,0,0,.22)!important;font:750 .8rem/1.2 Inter,ui-sans-serif,system-ui,sans-serif!important;letter-spacing:.01em!important;pointer-events:none!important}
    html[data-theme='light'].ff-auth-restoring body.auth-pending #authGate::after,
    html[data-theme='light'] body.auth-pending #authGate[data-auth-state='initializing']::after,
    html[data-theme='light'] body.auth-pending #authGate[data-auth-state='authenticating']::after{border-color:#d0deeb!important;background:rgba(255,255,255,.96)!important;color:#27415f!important;box-shadow:0 18px 45px rgba(43,72,107,.12)!important}
    @keyframes ffRestoreSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){html.ff-auth-restoring body.auth-pending #authGate::before,body.auth-pending #authGate[data-auth-state='initializing']::before,body.auth-pending #authGate[data-auth-state='authenticating']::before{animation:none!important}}
  `;
  document.head.appendChild(style);
})();

(async()=>{
  const VERSION='workspace-v3-1';
  const fail=msg=>{
    document.documentElement.classList.remove('ff-auth-restoring');
    console.error('[FinalForge]',msg);
    const status=document.getElementById('authBootStatus');
    if(status){status.textContent='Secure sign-in could not load.';status.classList.add('is-error')}
    const note=document.getElementById('authConfigNote');
    if(note){note.hidden=false;note.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`}
  };

  const loadScript=src=>new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(src));
    if(existing){
      if(existing.dataset.ffLoaded==='1'||existing.readyState==='complete')return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src.startsWith('assets/')?`${src}?v=${VERSION}`:src;
    script.async=true;
    script.onload=()=>{script.dataset.ffLoaded='1';resolve()};
    script.onerror=()=>reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });

  const loadStyle=href=>new Promise((resolve,reject)=>{
    const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href&&link.href.includes(href));
    if(existing){if(existing.sheet)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${href}`)),{once:true});return}
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=`${href}?v=${VERSION}`;link.onload=resolve;link.onerror=()=>reject(new Error(`Could not load ${href}`));
    document.head.appendChild(link);
  });

  try{
    if(!('DecompressionStream' in window))throw new Error('This browser is too old for FinalForge. Please update your browser.');

    const stylesReady=Promise.all([
      loadStyle('assets/ui-responsive-v2.css'),
      loadStyle('assets/auth-experience-v4.css'),
      loadStyle('assets/dashboard-modern-v3.css'),
      loadStyle('assets/mobile-modern-v4.css'),
      loadStyle('assets/product-ui-v4.css'),
      loadStyle('assets/product-ui-v5.css'),
      loadStyle('assets/tailwind.generated.css'),
      loadStyle('assets/auth-premium-v5.css'),
      loadStyle('assets/reference-refresh.css'),
      loadStyle('assets/experience-v9.css'),
      loadStyle('assets/auth-world-v1.css'),
      loadStyle('assets/theme-coherence-v1.css'),
      loadStyle('assets/responsive-hardening-v2.css'),
      loadStyle('assets/auth-neon-rounded-v1.css'),
      loadStyle('assets/past-papers-v1.css'),
      loadStyle('assets/student-experience-v2.css'),
      loadStyle('assets/visual-system-v2.css'),
      loadStyle('assets/mobile-auth-v5.css'),
      loadStyle('assets/desktop-auth-v6.css'),
      loadStyle('assets/runtime-stability-v1.css'),
      loadStyle('assets/mobile-runtime-final-v1.css'),
      loadStyle('assets/mobile-scroll-recovery-v1.css'),
      loadStyle('assets/professional-workspace-v2.css'),
      loadStyle('assets/professional-accessibility-v1.css'),
      loadStyle('assets/auth-system-v2.css'),
      loadStyle('assets/auth-responsive-hotfix-v1.css'),
      loadStyle('assets/stability-mode-v1.css'),
      loadStyle('assets/premium-shell-v1.css'),
      loadStyle('assets/workspace-v3.css')
    ]);

    const firebaseSdkReady=(async()=>{
      await Promise.all([
        loadScript('assets/firebase-config.js'),
        loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
      ]);
      await Promise.all([
        loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js'),
        loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js')
      ]);
    })();

    const paths=['00','01','02','03','04','05a','05b','05c','05d','06'].map(x=>`assets/core/chunk-${x}.txt`);
    const parts=await Promise.all(paths.map(async path=>{
      const response=await fetch(path,{cache:'force-cache'});
      if(!response.ok)throw new Error(`Core bundle chunk failed (${path}, ${response.status}).`);
      return response.text();
    }));

    await stylesReady;
    const binary=atob(parts.join(''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const bundle=JSON.parse(await new Response(stream).text());

    const coreStyle=document.createElement('style');
    coreStyle.dataset.finalforgeCore='1';
    coreStyle.textContent=bundle['styles.css'];
    document.head.prepend(coreStyle);

    (0,eval)(bundle['data.js']);
    if(!window.FINALFORGE_DATA&&window.EXAMHUB_DATA)window.FINALFORGE_DATA=window.EXAMHUB_DATA;
    (0,eval)(bundle['practice-data.js']);

    await loadScript('assets/resource-delivery-v1.js');
    await firebaseSdkReady;
    await loadScript('assets/account-storage-v1.js');

    /* Functional application layer only. */
    await loadScript('assets/app.js');
    await loadScript('assets/past-papers-v1.js');
    await loadScript('assets/appearance-v1.js');
    await loadScript('assets/theme-toggle-stability-v1.js');
    await loadScript('assets/practice-exam-v4.js');
    await loadScript('assets/ip-paper-extension-v1.js');
    await loadScript('assets/ip-challenge-v2.js');
    await loadScript('assets/study-experience.js');
    await loadScript('assets/stability-runtime-v1.js');
    await loadScript('assets/premium-ui-v1.js');
    await loadScript('assets/workspace-v3.js');
    await loadScript('assets/mobile-runtime-final-v1.js');

    /* Auth remains the only authentication owner. */
    await firebaseSdkReady;
    await loadScript('assets/auth.js');

    /* Small functional navigation guards only; no decorative scanners/observers. */
    await loadScript('assets/practice-stability-v1.js');
    await loadScript('assets/mobile-navigation-runtime-v2.js');
    await loadScript('assets/mobile-scroll-recovery-v1.js');

    /* Intentionally omitted in premium stability mode: product-motion, tailwind-runtime,
       professional-workspace, student-experience, product-ui runtime,
       auth-world runtime, reference-enhancements and cloud-ui-stability. */

    const status=document.getElementById('authBootStatus');
    if(status)status.hidden=true;

    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.dispatchEvent(new CustomEvent('finalforge-ready'));
  }catch(error){fail(error?.message||String(error))}
})();
