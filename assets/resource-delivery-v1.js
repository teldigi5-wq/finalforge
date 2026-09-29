/* FinalForge private resource delivery v2.
   Browser sends only stable resource IDs; signed URLs are never persisted. */
(()=>{
  'use strict';
  const TIMETABLE_ID='official-timetable-v3-2026-09-15';
  const LEGACY_TIMETABLE_PATH='official/Y1S1_Final_Exam_Timetable_V3_15-09-2026.pdf';
  const FNV_OFFSET=0xcbf29ce484222325n,FNV_PRIME=0x100000001b3n;
  const resourceIdForPath=path=>{
    let hash=FNV_OFFSET;
    for(const byte of new TextEncoder().encode(String(path||''))){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*FNV_PRIME)}
    return `ffr1_${hash.toString(16).padStart(16,'0')}`;
  };
  const data=window.FINALFORGE_DATA||window.EXAMHUB_DATA||{};
  const knownIds=new Set([TIMETABLE_ID]);
  const REQUEST_TIMEOUT_MS=20000;

  for(const resource of data.resources||[]){
    if(!resource?.path)continue;
    resource.resourceId=resourceIdForPath(resource.path);
    knownIds.add(resource.resourceId);
  }

  const notify=message=>{
    try{if(typeof window.toast==='function')return window.toast(message)}catch{}
    console.warn('[FinalForge resources]',message);
  };

  function placeholderMarkup(state='loading',message='Preparing your protected resource…'){
    const light=document.documentElement.dataset.theme==='light';
    const bg=light?'#f4f7fb':'#07111f';
    const panel=light?'#ffffff':'#0c1b2e';
    const text=light?'#13263e':'#f4f8ff';
    const muted=light?'#64778d':'#92a7c0';
    const line=light?'rgba(45,78,118,.14)':'rgba(139,180,235,.17)';
    const icon=state==='error'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 3.8 2.5 17.3A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.7L13.7 3.8a2 2 0 0 0-3.4 0Z"/></svg>'
      : '<span class="spinner" aria-hidden="true"></span>';
    const action=state==='error'?'<button type="button" onclick="window.close()">Close tab</button>':'';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FinalForge · Secure resource</title><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:${bg};color:${text};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100vh;display:grid;place-items:center;padding:24px}.panel{width:min(460px,100%);padding:30px;border:1px solid ${line};border-radius:20px;background:${panel};box-shadow:0 24px 70px rgba(0,0,0,.18);text-align:center}.brand{display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;font-weight:800;letter-spacing:-.02em}.brand img{width:32px;height:32px;object-fit:contain}.visual{width:48px;height:48px;margin:0 auto 18px;display:grid;place-items:center;border-radius:15px;background:rgba(80,149,255,.10);color:#69adff}.visual svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.spinner{width:22px;height:22px;border:2px solid rgba(94,166,255,.2);border-top-color:#5b9dff;border-radius:50%;animation:spin .8s linear infinite}h1{margin:0;font-size:1.35rem;letter-spacing:-.03em}p{margin:10px auto 0;max-width:340px;color:${muted};font-size:.9rem;line-height:1.6}button{margin-top:20px;min-height:44px;padding:0 18px;border:1px solid ${line};border-radius:12px;background:rgba(84,145,235,.10);color:${text};font:750 .85rem/1 system-ui;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spinner{animation:none;border-top-color:#5b9dff}}
    </style></head><body><main class="panel" role="status" aria-live="polite"><div class="brand"><img src="${location.origin}/assets/finalforge-logo.svg" alt=""><span>FinalForge</span></div><div class="visual">${icon}</div><h1>${state==='error'?'Resource could not be opened':'Opening secure resource'}</h1><p>${message}</p>${action}</main></body></html>`;
  }

  function openPlaceholder(){
    let tab=null;
    try{
      tab=window.open('about:blank','_blank');
      if(tab){
        tab.document.open();
        tab.document.write(placeholderMarkup());
        tab.document.close();
      }
    }catch{}
    return tab;
  }

  function showPlaceholderError(tab,message){
    try{
      if(!tab||tab.closed)return;
      tab.document.open();
      tab.document.write(placeholderMarkup('error',message));
      tab.document.close();
    }catch{}
  }

  async function requestSignedUrl(resourceId){
    const user=window.firebase?.apps?.length?window.firebase.auth().currentUser:null;
    if(!user)throw new Error('AUTH_REQUIRED');
    const token=await user.getIdToken();
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS):0;
    try{
      const response=await fetch('/api/resource-url',{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({resourceId}),
        credentials:'same-origin',
        cache:'no-store',
        signal:controller?.signal
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||typeof payload.url!=='string')throw new Error(payload.error||'RESOURCE_UNAVAILABLE');
      const target=new URL(payload.url);
      if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co'))throw new Error('INVALID_RESOURCE_URL');
      return target.href;
    }finally{
      if(timer)clearTimeout(timer);
    }
  }

  async function openResource(resourceId){
    const id=String(resourceId||'');
    if(!knownIds.has(id)){notify('This resource is not available in the protected library.');return false}

    const placeholder=openPlaceholder();
    window.dispatchEvent(new CustomEvent('finalforge-resource-opening',{detail:{resourceId:id}}));

    try{
      const target=await requestSignedUrl(id);
      if(placeholder&&!placeholder.closed){
        placeholder.location.replace(target);
        try{placeholder.opener=null}catch{}
      }else{
        window.location.assign(target);
      }
      window.dispatchEvent(new CustomEvent('finalforge-resource-opened',{detail:{resourceId:id}}));
      return true;
    }catch(error){
      const timedOut=error?.name==='AbortError';
      const authRequired=error?.message==='AUTH_REQUIRED';
      const message=authRequired
        ? 'Your session is not signed in. Return to FinalForge and sign in again.'
        : timedOut
          ? 'The secure resource request took too long. Close this tab and try again.'
          : 'The secure resource could not be prepared. Close this tab and try again.';
      showPlaceholderError(placeholder,message);
      if(authRequired)notify('Sign in before opening protected resources.');
      else if(timedOut)notify('Resource opening timed out. Please try again.');
      else notify('This resource could not be opened securely. Please try again.');
      window.dispatchEvent(new CustomEvent('finalforge-resource-error',{detail:{resourceId:id,reason:authRequired?'auth':timedOut?'timeout':'unavailable'}}));
      return false;
    }
  }

  function protectLegacyTimetableLinks(root=document){
    root.querySelectorAll?.(`a[href="${LEGACY_TIMETABLE_PATH}"]`).forEach(anchor=>{
      anchor.dataset.finalforgeResourceId=TIMETABLE_ID;
      anchor.href='#';
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    });
  }

  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[data-finalforge-resource-id]');
    if(!anchor)return;
    event.preventDefault();
    event.stopPropagation();
    void openResource(anchor.dataset.finalforgeResourceId);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>protectLegacyTimetableLinks(),{once:true});
  else protectLegacyTimetableLinks();
  addEventListener('finalforge-ready',()=>protectLegacyTimetableLinks(),{once:true});

  Object.assign(window,{
    finalforgeOpenResource:openResource,
    finalforgeResourceIdForPath:resourceIdForPath,
    FINALFORGE_OFFICIAL_TIMETABLE_RESOURCE_ID:TIMETABLE_ID
  });
})();
