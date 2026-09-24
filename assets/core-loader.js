/* FinalForge production bundle loader — reconstructs the optimized UI/practice bundle from Git-friendly chunks. */
(async()=>{
  const fail=(msg)=>{
    console.error('[FinalForge]',msg);
    const gate=document.getElementById('authGate');
    if(gate){const n=document.getElementById('authConfigNote');if(n){n.hidden=false;n.innerHTML=`<b>FinalForge could not start.</b><br>${msg}`;}}
  };
  const loadScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s)});
  try{
    if(!('DecompressionStream' in window)) throw new Error('This browser is too old for the optimized FinalForge bundle. Please update your browser.');
    const paths=[0,1,2,3,4,5,6].map(i=>`assets/core/chunk-${String(i).padStart(2,'0')}.txt`);
    const parts=await Promise.all(paths.map(async p=>{
      const r=await fetch(p,{cache:'no-cache'});
      if(!r.ok) throw new Error(`Core bundle chunk failed (${p}, ${r.status}).`);
      return r.text();
    }));
    const b64=parts.join('');
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    const b=JSON.parse(text);
    const style=document.createElement('style');style.dataset.finalforgeCore='1';style.textContent=b['styles.css'];document.head.appendChild(style);
    (0,eval)(b['data.js']);
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
