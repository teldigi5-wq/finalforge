/* FinalForge production loader — stable first paint, parallel auth boot, cached app reconstruction. */
try{
  const t=localStorage.getItem('finalforge_theme_v1');
  const initial=t==='light'||t==='dark'?t:'dark';
  document.documentElement.dataset.theme=initial;
  document.documentElement.style.background=initial==='dark'?'#07111f':'#f4f7fb';
  document.documentElement.style.colorScheme=initial;
}catch{
  document.documentElement.style.background='#07111f';
  document.documentElement.style.colorScheme='dark';
}

/* Keep login/signup out of the first paint until Firebase has restored the saved session. */
document.documentElement.classList.add('ff-auth-restoring');
(()=>{
  const style=document.createElement('style');
  style.id='ff-session-restore-critical';
  style.textContent=`
    html.ff-auth-restoring body.auth-pending .auth-shell{
      opacity:0!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    html.ff-auth-restoring body.auth-pending #authGate{
      display:grid!important;
      place-items:center!important;
    }
    html.ff-auth-restoring body.auth-pending #authGate::after{
      content:'Restoring your session…'!important;
      position:fixed!important;
      z-index:80!important;
      left:50%!important;
      top:50%!important;
      right:auto!important;
      bottom:auto!important;
      width:auto!important;
      height:auto!important;
      min-width:13rem!important;
      transform:translate(-50%,-50%)!important;
      filter:none!important;
      opacity:1!important;
      padding:.78rem 1rem .78rem 2.55rem!important;
      border:1px solid rgba(120,158,213,.22)!important;
      border-radius:999px!important;
      background:linear-gradient(135deg,rgba(13,27,47,.96),rgba(8,18,33,.98))!important;
      color:#dce9f8!important;
      box-shadow:0 18px 50px rgba(0,0,0,.28)!important;
      font:750 .82rem/1.2 Inter,ui-sans-serif,system-ui,sans-serif!important;
      letter-spacing:.01em!important;
      text-align:center!important;
      pointer-events:none!important;
    }
    html.ff-auth-restoring body.auth-pending #authGate::before{
      content:''!important;
    }
    html[data-theme='light'].ff-auth-restoring body.auth-pending #authGate::after{
      border-color:#d0deeb!important;
      background:rgba(255,255,255,.96)!important;
      color:#27415f!important;
      box-shadow:0 18px 45px rgba(43,72,107,.14)!important;
    }
    @media(prefers-reduced-motion:no-preference){
      html.ff-auth-restoring body.auth-pending #authGate::after{animation:ffSessionRestorePulse 1.4s ease-in-out infinite alternate!important}
      @keyframes ffSessionRestorePulse{from{opacity:.72}to{opacity:1}}
    }
  `;
  document.head.appendChild(style);
})();

(async()=>{
  const fail=(msg)=>{
    document.documentElement.classList.remove('ff-auth-restoring');
    console.error('[FinalForge]',msg);
    const status=document.getElementById('authBootStatus');if(status){status.textContent='Secure sign-in could not load.';status.classList.add('is-error');}
    const gate=document.getElementById('authGate');
    if(gate){const n=document.getElementById('authConfigNote');if(n){n.hidden=false;n.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`;}}
  };
  const loadScript=src=>new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(src));
    if(existing){if(existing.dataset.ffLoaded==='1'||existing.readyState==='complete')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});return;}
    const s=document.createElement('script');s.src=src.startsWith('assets/')?`${src}?v=session-v1`:src;s.async=true;s.onload=()=>{s.dataset.ffLoaded='1';resolve()};s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);
  });
  const loadStyle=href=>new Promise((resolve,reject)=>{
    const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>l.href&&l.href.includes(href));
    if(existing){if(existing.sheet)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${href}`)),{once:true});return;}
    const l=document.createElement('link');l.rel='stylesheet';l.href=`${href}?v=session-v1`;l.onload=resolve;l.onerror=()=>reject(new Error(`Could not load ${href}`));document.head.appendChild(l);
  });
  const preconnect=href=>{if(document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;const l=document.createElement('link');l.rel='preconnect';l.href=href;l.crossOrigin='anonymous';document.head.appendChild(l)};

  preconnect('https://www.gstatic.com');

  try{
    if(!('DecompressionStream' in window)) throw new Error('This browser is too old for the optimized FinalForge bundle. Please update your browser.');

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
      loadStyle('assets/visual-system-v2.css')
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
    const parts=await Promise.all(paths.map(async p=>{
      const r=await fetch(p,{cache:'force-cache'});
      if(!r.ok)throw new Error(`Core bundle chunk failed (${p}, ${r.status}).`);
      return r.text();
    }));

    await stylesReady;

    const b64=parts.join('');
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    const b=JSON.parse(text);

    const style=document.createElement('style');style.dataset.finalforgeCore='1';style.textContent=b['styles.css'];document.head.prepend(style);

    (0,eval)(b['data.js']);
    if(!window.FINALFORGE_DATA&&window.EXAMHUB_DATA)window.FINALFORGE_DATA=window.EXAMHUB_DATA;
    (0,eval)(b['practice-data.js']);
    await loadScript('assets/app.js');
    await loadScript('assets/past-papers-v1.js');
    await loadScript('assets/product-ui-v4.js');
    await loadScript('assets/appearance-v1.js');
    await loadScript('assets/practice-exam-v4.js');
    await loadScript('assets/study-experience.js');
    await loadScript('assets/student-experience-v2.js');

    await firebaseSdkReady;
    await loadScript('assets/auth.js');
    await loadScript('assets/session-restore-v1.js');
    await loadScript('assets/auth-experience-v4.js');
    await loadScript('assets/mobile-experience-v4.js');
    await loadScript('assets/tailwind-runtime-v6.js');
    await loadScript('assets/product-motion-v5.js');
    await loadScript('assets/reference-enhancements.js');
    await loadScript('assets/auth-world-v1.js');
    const status=document.getElementById('authBootStatus');if(status)status.hidden=true;

    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.dispatchEvent(new CustomEvent('finalforge-ready'));
  }catch(err){fail(err?.message||String(err));}
})();
