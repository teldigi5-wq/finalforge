/* FinalForge private resource delivery v5.
   Browser sends only stable resource IDs; signed URLs and ID tokens are never persisted. */
(()=>{
  'use strict';
  const TIMETABLE_ID='official-timetable-v3-2026-09-15';
  const LEGACY_TIMETABLE_PATH='official/Y1S1_Final_Exam_Timetable_V3_15-09-2026.pdf';
  const STORAGE_ORIGIN='https://jzgpwmxwekkbxdkhtsai.supabase.co';
  const OPENING_PAGE='/resource-opening.html';
  const REQUEST_TIMEOUT_MS=20000;
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

  const openingUrl=(state='loading',reason='')=>{
    const url=new URL(OPENING_PAGE,location.origin);
    url.searchParams.set('state',state);
    if(reason)url.searchParams.set('reason',reason);
    return url.href;
  };

  function openPlaceholder(){
    let tab=null;
    try{
      tab=window.open(openingUrl('loading'),'_blank');
      if(tab)try{tab.opener=null}catch{}
    }catch{}
    return tab;
  }

  function showPlaceholderError(tab,reason){
    try{
      if(tab&&!tab.closed){tab.location.replace(openingUrl('error',reason));return}
    }catch{}
  }

  async function signedUrlResponse(user,resourceId,{forceRefresh=true}={}){
    const token=await user.getIdToken(forceRefresh);
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS):0;
    try{
      const response=await fetch('/api/resource-url',{
        method:'POST',
        // Azure Static Web Apps reserves the Authorization header for its own
        // managed auth path. Use a FinalForge-specific same-origin header so the
        // Firebase ID token arrives unchanged at the managed Function.
        headers:{'X-FinalForge-ID-Token':token,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({resourceId}),
        credentials:'same-origin',
        cache:'no-store',
        signal:controller?.signal
      });
      const payload=await response.json().catch(()=>({}));
      return {response,payload};
    }finally{
      if(timer)clearTimeout(timer);
    }
  }

  async function requestSignedUrl(resourceId){
    let user=window.firebase?.apps?.length?window.firebase.auth().currentUser:null;
    if(!user){const error=new Error('Authentication required.');error.code='AUTH_REQUIRED';error.status=401;throw error}

    let result=await signedUrlResponse(user,resourceId,{forceRefresh:true});

    if(result.response.status===401){
      try{
        await user.reload();
        user=window.firebase.auth().currentUser||user;
        result=await signedUrlResponse(user,resourceId,{forceRefresh:true});
      }catch(reloadError){
        const error=new Error('Authentication required.');
        error.code='AUTH_REQUIRED';error.status=401;error.cause=reloadError;
        throw error;
      }
    }

    const {response,payload}=result;
    if(!response.ok||typeof payload.url!=='string'){
      const error=new Error(payload.error||'Resource request failed.');
      error.status=response.status;
      error.code=String(payload.code||'RESOURCE_UNAVAILABLE');
      throw error;
    }
    const target=new URL(payload.url);
    if(target.protocol!=='https:'||target.origin!==STORAGE_ORIGIN)throw Object.assign(new Error('Invalid resource destination.'),{code:'INVALID_RESOURCE_URL'});
    return target.href;
  }

  function errorReason(error){
    if(error?.name==='AbortError')return'timeout';
    if(error?.status===401||error?.code==='AUTH_REQUIRED')return'auth';
    if(error?.status===403||error?.code==='ACCESS_DENIED')return'access';
    if(error?.code==='AUTH_VERIFY_UNAVAILABLE'||error?.code==='AUTHZ_UNAVAILABLE')return'authz';
    if(error?.status===404||error?.code==='RESOURCE_NOT_FOUND')return'missing';
    if(error?.code==='STORAGE_UNAVAILABLE'||error?.status===503)return'storage';
    return'unavailable';
  }

  function toastForReason(reason){
    return ({
      auth:'Your secure session needs to be renewed. Return to FinalForge and sign in again.',
      access:'Your approved student access could not be verified. Refresh once and try again.',
      authz:'The secure verification service is temporarily unavailable. Please try again.',
      missing:'This resource is not currently available.',
      storage:'Private resource storage is temporarily unavailable. Please try again.',
      timeout:'Resource opening timed out. Please try again.',
      unavailable:'This resource could not be opened securely. Please try again.'
    })[reason];
  }

  async function openResource(resourceId){
    const id=String(resourceId||'');
    if(!knownIds.has(id)){notify('This resource is not available in the protected library.');return false}

    const placeholder=openPlaceholder();
    window.dispatchEvent(new CustomEvent('finalforge-resource-opening',{detail:{resourceId:id}}));

    try{
      const target=await requestSignedUrl(id);
      if(placeholder&&!placeholder.closed){placeholder.location.replace(target)}
      else window.location.assign(target);
      window.dispatchEvent(new CustomEvent('finalforge-resource-opened',{detail:{resourceId:id}}));
      return true;
    }catch(error){
      const reason=errorReason(error);
      showPlaceholderError(placeholder,reason);
      notify(toastForReason(reason));
      window.dispatchEvent(new CustomEvent('finalforge-resource-error',{detail:{resourceId:id,reason}}));
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