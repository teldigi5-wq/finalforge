/* FinalForge production loader — stable dark first paint, parallel auth boot, cached app reconstruction. */
document.documentElement.style.background='#05090f';
document.documentElement.style.colorScheme='dark';

(async()=>{
  const fail=(msg)=>{
    console.error('[FinalForge]',msg);
    const gate=document.getElementById('authGate');
    if(gate){const n=document.getElementById('authConfigNote');if(n){n.hidden=false;n.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`;}}
  };
  const loadScript=src=>new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(src));
    if(existing){if(existing.dataset.ffLoaded==='1'||existing.readyState==='complete')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});return;}
    const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.ffLoaded='1';resolve()};s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);
  });
  const loadStyle=href=>new Promise((resolve,reject)=>{
    const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>l.href&&l.href.includes(href));
    if(existing){if(existing.sheet)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${href}`)),{once:true});return;}
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=resolve;l.onerror=()=>reject(new Error(`Could not load ${href}`));document.head.appendChild(l);
  });
  const preconnect=href=>{if(document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;const l=document.createElement('link');l.rel='preconnect';l.href=href;l.crossOrigin='anonymous';document.head.appendChild(l)};

  const critical=document.createElement('style');
  critical.dataset.finalforgeCritical='1';
  critical.textContent=`html,body{margin:0;min-width:320px;min-height:100%;background:#05090f!important;color:#f2f7fd;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body.auth-pending #authGate{opacity:1!important;visibility:visible!important}.auth-gate{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;overflow:hidden;background:radial-gradient(900px 680px at 3% 4%,#465dff26,transparent 64%),radial-gradient(720px 580px at 98% 100%,#7e57ff1f,transparent 64%),#05090f}.auth-shell{width:min(1260px,100%);min-height:min(760px,calc(100dvh - 48px));display:grid;grid-template-columns:minmax(0,1.16fr) minmax(440px,.84fr);overflow:hidden;border:1px solid #ffffff16;border-radius:24px;background:#07101b;box-shadow:0 24px 80px #0006}.auth-brand-panel,.auth-card{min-width:0}.auth-brand-panel{display:flex;flex-direction:column;justify-content:center;padding:42px;background:linear-gradient(145deg,#0b1726,#081321 58%,#07101b)}.auth-brand-panel h1{font-size:clamp(3rem,4.55vw,5.2rem);line-height:.94;letter-spacing:-.06em;margin:0 0 18px}.gradient-text{color:#8b7cff}.auth-brand-panel>p{max-width:590px;color:#a5b5c8;line-height:1.65}.auth-points{display:grid;grid-template-columns:1fr 1fr;gap:10px}.auth-points span{padding:10px 12px;border:1px solid #ffffff16;border-radius:12px;color:#b8c5d4}.auth-card{display:flex;flex-direction:column;justify-content:center;padding:42px clamp(34px,4vw,58px);background:#060d17}.auth-tabs,.auth-role-toggle{display:grid!important;grid-template-columns:1fr 1fr!important;gap:4px!important;padding:4px!important;border:1px solid #ffffff16;border-radius:12px}.auth-tabs{margin-bottom:14px}.auth-tabs button,.auth-role-toggle button{min-height:40px;border:0;border-radius:9px;background:transparent;color:#73869d;font:inherit;font-weight:800}.auth-tabs button.active,.auth-role-toggle button.active{color:white;background:linear-gradient(105deg,#5aa9ff2b,#8b7cff25)}.auth-view:not(.active){display:none!important}.auth-view label{display:grid;gap:7px;margin:0 0 14px;color:#b8c6d5;font-size:12px;font-weight:750}.auth-view input{width:100%;min-height:50px;padding:0 14px;border:1px solid #ffffff18;border-radius:11px;background:#08131f;color:white;font:inherit}.password-wrap{position:relative}.password-wrap button{position:absolute;right:6px;top:6px;height:38px}.auth-submit{width:100%;min-height:50px;border:0;border-radius:11px;color:white;font-weight:850;background:linear-gradient(105deg,#5aa9ff,#8b7cff)}.text-btn{width:100%;margin-top:8px;min-height:38px;border:0;background:transparent;color:#7c90ff}.app{visibility:hidden}@media(max-width:980px){.auth-gate{place-items:start center;padding:14px;overflow-y:auto}.auth-shell{grid-template-columns:1fr;min-height:0;width:min(700px,100%)}.auth-brand-panel,.auth-card{padding:28px}.auth-brand-panel h1{font-size:clamp(2.6rem,8vw,4.2rem)}}@media(max-width:600px){.auth-gate{padding:0}.auth-shell{width:100%;min-height:100dvh;border:0;border-radius:0}.auth-brand-panel{padding:20px}.auth-card{padding:28px 20px 38px}.auth-brand-panel h1{font-size:clamp(2.45rem,12vw,3.25rem)}}`;
  document.head.appendChild(critical);

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
      loadStyle('assets/auth-premium-v5.css')
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

    const style=document.createElement('style');style.dataset.finalforgeCore='1';style.textContent=b['styles.css'];document.head.appendChild(style);
    critical.remove();

    (0,eval)(b['data.js']);
    if(!window.FINALFORGE_DATA&&window.EXAMHUB_DATA)window.FINALFORGE_DATA=window.EXAMHUB_DATA;
    (0,eval)(b['practice-data.js']);
    await loadScript('assets/app.js');
    await loadScript('assets/product-ui-v4.js');

    (0,eval)(b['practice.js']);
    await loadScript('assets/practice-v3.js');
    await loadScript('assets/practice-runtime-bridge.js');
    (0,eval)(b['experience.js']);

    await firebaseSdkReady;
    await loadScript('assets/auth.js');
    await loadScript('assets/auth-experience-v4.js');
    await loadScript('assets/auth-premium-v5.js');
    await loadScript('assets/mobile-experience-v4.js');
    await loadScript('assets/tailwind-runtime-v6.js');
    await loadScript('assets/product-motion-v5.js');
    await loadStyle('assets/reference-refresh.css');

    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.dispatchEvent(new CustomEvent('finalforge-ready'));
  }catch(err){fail(err?.message||String(err));}
})();
