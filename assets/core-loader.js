/* FinalForge production loader — stable dark first paint, parallel auth boot, cached app reconstruction. */
document.documentElement.style.background='#020304';
document.documentElement.style.colorScheme='dark';

(async()=>{
  const fail=(msg)=>{
    console.error('[FinalForge]',msg);
    const status=document.getElementById('authBootStatus');if(status){status.textContent='Secure sign-in could not load.';status.classList.add('is-error');}
    const gate=document.getElementById('authGate');
    if(gate){const n=document.getElementById('authConfigNote');if(n){n.hidden=false;n.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`;}}
  };
  const loadScript=src=>new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(src));
    if(existing){if(existing.dataset.ffLoaded==='1'||existing.readyState==='complete')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});return;}
    const s=document.createElement('script');s.src=src.startsWith('assets/')?`${src}?v=responsive-qa-15`:src;s.async=true;s.onload=()=>{s.dataset.ffLoaded='1';resolve()};s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);
  });
  const loadStyle=href=>new Promise((resolve,reject)=>{
    const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>l.href&&l.href.includes(href));
    if(existing){if(existing.sheet)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${href}`)),{once:true});return;}
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=resolve;l.onerror=()=>reject(new Error(`Could not load ${href}`));document.head.appendChild(l);
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
      loadStyle('assets/auth-neon-rounded-v1.css')
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
    await loadScript('assets/product-ui-v4.js');
    await loadScript('assets/appearance-v1.js');
    await loadScript('assets/practice-exam-v4.js');
    await loadScript('assets/study-experience.js');

    await firebaseSdkReady;
    await loadScript('assets/auth.js');
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
