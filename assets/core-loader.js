/* FinalForge production loader — stable dark first paint, parallel auth boot, cached app reconstruction. */
document.documentElement.style.background='#06111f';
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

  /* This fallback is installed synchronously before any network or bundle work. */
  const critical=document.createElement('style');
  critical.dataset.finalforgeCritical='1';
  critical.textContent=`html,body{margin:0;min-width:320px;min-height:100%;background:#06111f!important;color:#f5f8fc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body.auth-pending #authGate{opacity:1!important;visibility:visible!important}.auth-gate{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:18px;overflow-x:hidden;background:radial-gradient(900px 620px at 8% 8%,#2563eb2e,transparent 62%),radial-gradient(760px 560px at 95% 92%,#10b98120,transparent 64%),linear-gradient(135deg,#06111f,#071724 52%,#071917)}.auth-shell{width:min(1220px,100%);min-height:min(720px,calc(100dvh - 36px));display:grid;grid-template-columns:minmax(0,1.08fr) minmax(410px,.92fr);overflow:hidden;border:1px solid #94cbff24;border-radius:30px;background:#081a2b;box-shadow:0 36px 100px #0006}.auth-brand-panel,.auth-card{min-width:0;padding:clamp(30px,4.5vw,64px)}.auth-brand-panel{display:flex;flex-direction:column;justify-content:center;background:linear-gradient(145deg,#173d638c,#0a2037d9)}.auth-logo-img{display:block;width:92px;height:auto;margin:0 0 16px}.auth-brand-panel h1{font-size:clamp(3rem,5vw,5.2rem);line-height:.95;letter-spacing:-.055em;margin:14px 0 18px}.gradient-text{color:#7dd3fc}.auth-brand-panel>p{max-width:650px;color:#b4c5d6;line-height:1.6}.auth-points{display:grid;grid-template-columns:1fr 1fr;gap:8px}.auth-points span{padding:10px 12px;border:1px solid #7dd3fc25;border-radius:13px;color:#c8d7e6}.auth-privacy{margin-top:12px;color:#70869d;font-size:12px}.auth-card{display:flex;flex-direction:column;justify-content:center;background:#04111f}.auth-tabs,.auth-role-toggle{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important;padding:5px!important;border:1px solid #7dd3fc22;border-radius:15px}.auth-tabs{margin-bottom:12px}.auth-tabs button,.auth-role-toggle button{min-height:42px;border:0;border-radius:11px;background:transparent;color:#8ea3b8;font:inherit;font-weight:800}.auth-tabs button.active,.auth-role-toggle button.active{color:white;background:#2563eb55}.auth-view:not(.active){display:none!important}.auth-view label{display:grid;gap:7px;margin:0 0 13px;color:#c7d6e5;font-size:13px;font-weight:700}.auth-view input{width:100%;min-height:50px;padding:0 14px;border:1px solid #7dd3fc26;border-radius:13px;background:#03101e;color:white;font:inherit}.password-wrap{position:relative}.password-wrap button{position:absolute;right:6px;top:6px;height:38px}.auth-submit{width:100%;min-height:50px;border:0;border-radius:13px;color:white;font-weight:850;background:linear-gradient(105deg,#3b82f6,#22b8cf 54%,#14b8a6)}.text-btn{width:100%;margin-top:8px;min-height:38px;border:0;background:transparent;color:#74c9ff}.app{visibility:hidden}@media(max-width:820px){.auth-gate{place-items:start center;padding:10px}.auth-shell{grid-template-columns:1fr;min-height:0}.auth-brand-panel,.auth-card{padding:24px}.auth-brand-panel h1{font-size:clamp(2.4rem,9vw,3.8rem)}.auth-privacy{display:none}}@media(max-width:560px){.auth-gate{padding:8px}.auth-shell{border-radius:22px}.auth-brand-panel,.auth-card{padding:20px}.auth-logo-img{width:62px}.auth-brand-panel h1{font-size:clamp(2.2rem,11.5vw,3rem)}.auth-points span{font-size:11px;padding:7px}}`;
  document.head.appendChild(critical);

  preconnect('https://www.gstatic.com');

  try{
    if(!('DecompressionStream' in window)) throw new Error('This browser is too old for the optimized FinalForge bundle. Please update your browser.');

    /* Final auth and dashboard styles + Firebase SDK begin loading immediately, in parallel with the local app bundle. */
    const stylesReady=Promise.all([
      loadStyle('assets/ui-responsive-v2.css'),
      loadStyle('assets/auth-experience-v4.css'),
      loadStyle('assets/dashboard-modern-v3.css')
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

    /* Base practice engine remains in the verified bundle; the live V3 layer is loaded from the maintained source file. */
    (0,eval)(b['practice.js']);
    await loadScript('assets/practice-v3.js');
    await loadScript('assets/practice-runtime-bridge.js');
    (0,eval)(b['experience.js']);

    await firebaseSdkReady;
    await loadScript('assets/auth.js');
    await loadScript('assets/auth-experience-v4.js');

    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.dispatchEvent(new CustomEvent('finalforge-ready'));
  }catch(err){fail(err?.message||String(err));}
})();
