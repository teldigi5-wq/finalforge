/* FinalForge private resource delivery v1.
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

  for(const resource of data.resources||[]){
    if(!resource?.path)continue;
    resource.resourceId=resourceIdForPath(resource.path);
    knownIds.add(resource.resourceId);
  }

  const notify=message=>{
    try{if(typeof window.toast==='function')return window.toast(message)}catch{}
    console.warn('[FinalForge resources]',message);
  };

  const closePlaceholder=tab=>{try{if(tab&&!tab.closed)tab.close()}catch{}};

  async function openResource(resourceId){
    const id=String(resourceId||'');
    if(!knownIds.has(id)){notify('This resource is not available in the protected library.');return false}

    let placeholder=null;
    try{
      placeholder=window.open('about:blank','_blank');
      if(placeholder)placeholder.opener=null;
    }catch{}

    try{
      const user=window.firebase?.apps?.length?window.firebase.auth().currentUser:null;
      if(!user)throw new Error('AUTH_REQUIRED');
      const token=await user.getIdToken();
      const response=await fetch('/api/resource-url',{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({resourceId:id}),
        credentials:'same-origin',
        cache:'no-store'
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||typeof payload.url!=='string')throw new Error(payload.error||'RESOURCE_UNAVAILABLE');
      const target=new URL(payload.url);
      if(target.protocol!=='https:')throw new Error('INVALID_RESOURCE_URL');
      if(placeholder&&!placeholder.closed)placeholder.location.replace(target.href);
      else window.location.assign(target.href);
      return true;
    }catch(error){
      closePlaceholder(placeholder);
      if(error?.message==='AUTH_REQUIRED')notify('Sign in before opening protected resources.');
      else notify('This resource could not be opened securely. Please try again.');
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
