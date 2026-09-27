/* FinalForge Account Storage v1 — UID-scoped study state with shared-browser isolation. */
(() => {
  'use strict';

  const ACCOUNT_PREFIX='ff_account_v1:';
  const LEGACY_QUARANTINE='ff_legacy_unowned_v1';
  const TRANSIENT_KEYS=new Set(['finalforge_pending_student']);
  const DEVICE_KEYS=new Set(['finalforge_theme_v1','finalforge_platform_rated']);
  const storage=window.localStorage;
  const transient=window.sessionStorage;
  let activeUid=null;
  let authWrapped=false;

  const native={
    get:storage.getItem.bind(storage),
    set:storage.setItem.bind(storage),
    remove:storage.removeItem.bind(storage),
    key:storage.key.bind(storage)
  };
  const session=transient?{
    get:transient.getItem.bind(transient),
    set:transient.setItem.bind(transient),
    remove:transient.removeItem.bind(transient)
  }:null;

  const str=value=>String(value ?? '');
  const isFinalForgeKey=key=>str(key).startsWith('finalforge_');
  const isTransientKey=key=>TRANSIENT_KEYS.has(str(key));
  const isDeviceKey=key=>DEVICE_KEYS.has(str(key));
  const isAccountKey=key=>isFinalForgeKey(key)&&!isTransientKey(key)&&!isDeviceKey(key);
  const ownerPrefix=uid=>`${ACCOUNT_PREFIX}${encodeURIComponent(uid)}:`;
  const physicalKey=(uid,key)=>`${ownerPrefix(uid)}${key}`;

  function parseQuarantine(){
    try{
      const value=JSON.parse(native.get(LEGACY_QUARANTINE)||'null');
      return value&&typeof value==='object'&&value.data&&typeof value.data==='object'?value:{version:1,data:{}};
    }catch{return {version:1,data:{}}}
  }

  function quarantineLegacy(){
    const captured={};
    const keys=[];
    for(let i=0;i<storage.length;i++){
      const key=native.key(i);
      if(key&&isAccountKey(key))keys.push(key);
    }
    for(const key of keys){
      const value=native.get(key);
      if(value!==null)captured[key]=value;
    }
    if(Object.keys(captured).length){
      const prior=parseQuarantine();
      native.set(LEGACY_QUARANTINE,JSON.stringify({version:1,quarantinedAt:Date.now(),data:{...prior.data,...captured}}));
      keys.forEach(key=>native.remove(key));
    }
    for(const key of TRANSIENT_KEYS){
      const value=native.get(key);
      if(value!==null&&session)session.set(key,value);
      native.remove(key);
    }
  }

  function virtualKeys(){
    const visible=[];
    const currentPrefix=activeUid?ownerPrefix(activeUid):'';
    for(let i=0;i<storage.length;i++){
      const key=native.key(i);
      if(!key||key===LEGACY_QUARANTINE)continue;
      if(key.startsWith(ACCOUNT_PREFIX)){
        if(currentPrefix&&key.startsWith(currentPrefix)){
          const logical=key.slice(currentPrefix.length);
          if(isAccountKey(logical))visible.push(logical);
        }
        continue;
      }
      if(isTransientKey(key)||isDeviceKey(key))continue;
      if(isFinalForgeKey(key))continue;
      visible.push(key);
    }
    return [...new Set(visible)];
  }

  function getItem(key){
    key=str(key);
    if(isTransientKey(key))return session?.get(key)??null;
    if(isAccountKey(key))return activeUid?native.get(physicalKey(activeUid,key)):null;
    return native.get(key);
  }

  function setItem(key,value,{silent=false}={}){
    key=str(key);value=str(value);
    if(isTransientKey(key)){
      session?.set(key,value);
      native.remove(key);
      if(!silent)notify('change',key);
      return;
    }
    if(isAccountKey(key)){
      if(!activeUid)return;
      native.set(physicalKey(activeUid,key),value);
      if(!silent)notify('change',key);
      return;
    }
    native.set(key,value);
    if(!silent&&isFinalForgeKey(key))notify('device-change',key);
  }

  function removeItem(key,{silent=false}={}){
    key=str(key);
    if(isTransientKey(key)){
      session?.remove(key);native.remove(key);
      if(!silent)notify('change',key);
      return;
    }
    if(isAccountKey(key)){
      if(!activeUid)return;
      native.remove(physicalKey(activeUid,key));
      if(!silent)notify('change',key);
      return;
    }
    native.remove(key);
    if(!silent&&isFinalForgeKey(key))notify('device-change',key);
  }

  function refreshViews(){
    for(const name of ['renderModules','renderHome','renderPlanner','renderPractice']){
      try{if(typeof window[name]==='function')window[name]()}catch{}
    }
  }

  function notify(type,key=null,{refresh=false}={}){
    if(refresh)refreshViews();
    try{
      window.dispatchEvent(new CustomEvent(`finalforge-account-storage-${type}`,{detail:{uid:activeUid,key}}));
    }catch{}
  }

  function bind(uid){
    uid=str(uid).trim();
    if(!uid){unbind();return false;}
    const changed=activeUid!==uid;
    activeUid=uid;
    if(changed)notify('bound',null,{refresh:true});
    return true;
  }

  function unbind(){
    if(!activeUid)return;
    activeUid=null;
    notify('unbound',null,{refresh:true});
  }

  function wrapAuth(auth){
    if(!auth||auth.__ffAccountStorageWrapped)return;
    auth.__ffAccountStorageWrapped=true;

    if(typeof auth.signInWithEmailAndPassword==='function'){
      const signIn=auth.signInWithEmailAndPassword.bind(auth);
      auth.signInWithEmailAndPassword=async(...args)=>{
        const credential=await signIn(...args);
        if(credential?.user?.uid)bind(credential.user.uid);
        return credential;
      };
    }

    if(typeof auth.signOut==='function'){
      const signOut=auth.signOut.bind(auth);
      auth.signOut=async(...args)=>{
        const result=await signOut(...args);
        unbind();
        return result;
      };
    }

    if(typeof auth.onAuthStateChanged==='function'){
      auth.onAuthStateChanged(user=>{
        if(user?.uid)bind(user.uid);else unbind();
      });
    }
  }

  function attachFirebase(){
    const firebase=window.firebase;
    if(!firebase||authWrapped)return;
    if(typeof firebase.initializeApp!=='function')return;
    const initialize=firebase.initializeApp.bind(firebase);
    firebase.initializeApp=function(...args){
      const app=initialize(...args);
      try{wrapAuth(firebase.auth())}catch{}
      return app;
    };
    authWrapped=true;
    try{if(firebase.apps?.length)wrapAuth(firebase.auth())}catch{}
  }

  storage.getItem=getItem;
  storage.setItem=(key,value)=>setItem(key,value);
  storage.removeItem=key=>removeItem(key);
  storage.key=index=>virtualKeys()[Number(index)]??null;

  quarantineLegacy();
  attachFirebase();

  window.addEventListener?.('storage',event=>{
    if(!activeUid||!event?.key)return;
    const prefix=ownerPrefix(activeUid);
    if(event.key.startsWith(prefix)){
      const logical=event.key.slice(prefix.length);
      if(isAccountKey(logical))notify('external-change',logical,{refresh:true});
    }
  });

  window.finalforgeAccountStorage={
    version:1,
    bind,
    unbind,
    currentUid:()=>activeUid,
    getItem,
    setItem,
    removeItem,
    isAccountKey,
    isDeviceKey,
    isTransientKey,
    physicalKey:(key,uid=activeUid)=>uid?physicalKey(uid,str(key)):null,
    attachFirebase
  };
})();
