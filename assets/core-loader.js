/* FinalForge production bundle loader — keeps the public repo compact while preserving the full UI/practice source. */
(async()=>{
  const fail=(msg)=>{
    console.error('[FinalForge]',msg);
    const gate=document.getElementById('authGate');
    if(gate){const n=document.getElementById('authConfigNote');if(n){n.hidden=false;n.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`;}}
  };
  const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s)});
  try{
    if(!('DecompressionStream' in window)) throw new Error('This browser is too old for the optimized FinalForge bundle. Please update your browser.');
    const res=await fetch('assets/core.bundle.gz',{cache:'no-cache'});
    if(!res.ok) throw new Error(`Core bundle request failed (${res.status}).`);
    const stream=res.body.pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    const b=JSON.parse(text);
    const style=document.createElement('style');style.dataset.finalforgeCore='1';style.textContent=b['styles.css'];document.head.appendChild(style);
    (0,eval)(b['data.js']);
    // V5 code expects FINALFORGE_DATA. Older generated datasets used EXAMHUB_DATA; bridge safely during the rebrand.
    if(!window.FINALFORGE_DATA&&window.EXAMHUB_DATA)window.FINALFORGE_DATA=window.EXAMHUB_DATA;
    (0,eval)(b['practice-data.js']);
    await loadScript('assets/app.js');
    (0,eval)(b['practice.js']);
    (0,eval)(b['practice-v3.js']);
    (0,eval)(b['experience.js']);
    await loadScript('assets/firebase-config.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');
    await loadScript('assets/auth.js');
    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
    window.dispatchEvent(new CustomEvent('finalforge-ready'));
  }catch(err){fail(err?.message||String(err));}
})();
