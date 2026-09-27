import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/account-storage-v1.js',import.meta.url),'utf8');

function storageFacade(backing){
  return {
    get length(){return backing.size},
    getItem(key){key=String(key);return backing.has(key)?backing.get(key):null},
    setItem(key,value){backing.set(String(key),String(value))},
    removeItem(key){backing.delete(String(key))},
    key(index){return [...backing.keys()][Number(index)]??null}
  };
}

function boot(shared=new Map(),sessionBacking=new Map()){
  const localStorage=storageFacade(shared),sessionStorage=storageFacade(sessionBacking);
  const listeners=new Map();
  const context={
    console,localStorage,sessionStorage,
    CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},
    addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list)},
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true},
    renderModules(){},renderHome(){},renderPlanner(){},renderPractice(){}
  };
  context.window=context;
  vm.runInNewContext(source,context);
  return {context,localStorage,sessionStorage,shared,sessionBacking,listeners};
}

test('unowned legacy study state is quarantined and never visible before binding',()=>{
  const shared=new Map([
    ['finalforge_progress','{"dcn":{"0":true}}'],
    ['finalforge_exam_v4_active','{"answers":{"q1":"secret"}}'],
    ['finalforge_theme_v1','dark'],
    ['finalforge_pending_student','IT26000000']
  ]);
  const {context,localStorage,sessionStorage}=boot(shared);
  assert.equal(localStorage.getItem('finalforge_progress'),null);
  assert.equal(localStorage.getItem('finalforge_exam_v4_active'),null);
  assert.equal(localStorage.getItem('finalforge_theme_v1'),'dark');
  assert.equal(sessionStorage.getItem('finalforge_pending_student'),'IT26000000');
  assert.equal(shared.has('finalforge_progress'),false);
  const quarantine=JSON.parse(shared.get('ff_legacy_unowned_v1'));
  assert.equal(quarantine.data.finalforge_progress,'{"dcn":{"0":true}}');
  assert.equal(context.finalforgeAccountStorage.currentUid(),null);
});

test('two tabs sharing one origin cannot read or enumerate each other study state',()=>{
  const shared=new Map();
  const a=boot(shared),b=boot(shared);
  a.context.finalforgeAccountStorage.bind('uid-A');
  b.context.finalforgeAccountStorage.bind('uid-B');

  a.localStorage.setItem('finalforge_progress','{"dcn":{"0":true}}');
  a.localStorage.setItem('finalforge_exam_v4_active','{"answers":{"java":"A-only"}}');
  b.localStorage.setItem('finalforge_progress','{"ip":{"0":true}}');

  assert.equal(a.localStorage.getItem('finalforge_progress'),'{"dcn":{"0":true}}');
  assert.equal(b.localStorage.getItem('finalforge_progress'),'{"ip":{"0":true}}');
  assert.match(a.localStorage.getItem('finalforge_exam_v4_active'),/A-only/);
  assert.equal(b.localStorage.getItem('finalforge_exam_v4_active'),null);

  const aVisible=Array.from({length:a.localStorage.length},(_,i)=>a.localStorage.key(i)).filter(Boolean);
  const bVisible=Array.from({length:b.localStorage.length},(_,i)=>b.localStorage.key(i)).filter(Boolean);
  assert.ok(aVisible.includes('finalforge_progress'));
  assert.ok(aVisible.includes('finalforge_exam_v4_active'));
  assert.ok(bVisible.includes('finalforge_progress'));
  assert.ok(!bVisible.includes('finalforge_exam_v4_active'));
  assert.ok(!aVisible.some(key=>key.startsWith('ff_account_v1:')));
  assert.ok(!bVisible.some(key=>key.startsWith('ff_account_v1:')));
});

test('device preference stays global while pending signup state is tab scoped',()=>{
  const shared=new Map();
  const a=boot(shared),b=boot(shared);
  a.context.finalforgeAccountStorage.bind('uid-A');
  b.context.finalforgeAccountStorage.bind('uid-B');
  a.localStorage.setItem('finalforge_theme_v1','light');
  a.localStorage.setItem('finalforge_platform_rated','1');
  a.localStorage.setItem('finalforge_pending_student','IT26111111');
  assert.equal(b.localStorage.getItem('finalforge_theme_v1'),'light');
  assert.equal(b.localStorage.getItem('finalforge_platform_rated'),'1');
  assert.equal(b.localStorage.getItem('finalforge_pending_student'),null);
  assert.equal(a.sessionStorage.getItem('finalforge_pending_student'),'IT26111111');
});

test('unknown future finalforge keys default to account scope',()=>{
  const shared=new Map();
  const a=boot(shared),b=boot(shared);
  a.context.finalforgeAccountStorage.bind('uid-A');
  b.context.finalforgeAccountStorage.bind('uid-B');
  a.localStorage.setItem('finalforge_future_notes','private');
  assert.equal(a.localStorage.getItem('finalforge_future_notes'),'private');
  assert.equal(b.localStorage.getItem('finalforge_future_notes'),null);
});

test('unbind makes account state unreadable without deleting the owner partition',()=>{
  const shared=new Map();
  const a=boot(shared);
  a.context.finalforgeAccountStorage.bind('uid-A');
  a.localStorage.setItem('finalforge_progress','{"mc":{"1":true}}');
  const physical=a.context.finalforgeAccountStorage.physicalKey('finalforge_progress');
  assert.equal(shared.get(physical),'{"mc":{"1":true}}');
  a.context.finalforgeAccountStorage.unbind();
  assert.equal(a.localStorage.getItem('finalforge_progress'),null);
  assert.equal(shared.get(physical),'{"mc":{"1":true}}');
});


test('local account writes do not force full UI rerenders during autosave',()=>{
  const shared=new Map(),sessionBacking=new Map();
  const localStorage=storageFacade(shared),sessionStorage=storageFacade(sessionBacking);
  let renders=0;
  const context={
    console,localStorage,sessionStorage,
    CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},
    addEventListener(){},dispatchEvent(){return true},
    renderModules(){renders++},renderHome(){renders++},renderPlanner(){renders++},renderPractice(){renders++}
  };
  context.window=context;
  vm.runInNewContext(source,context);
  context.finalforgeAccountStorage.bind('uid-A');
  renders=0;
  localStorage.setItem('finalforge_exam_v4_active','{\"answers\":{\"q1\":\"typing\"}}');
  assert.equal(renders,0);
});

test('Firebase sign-in binds the UID before the wrapped promise returns and sign-out unbinds',async()=>{
  const shared=new Map();
  const localStorage=storageFacade(shared),sessionStorage=storageFacade(new Map());
  const authListeners=[];
  const auth={
    currentUser:null,
    onAuthStateChanged(fn){authListeners.push(fn);return()=>{}},
    async signInWithEmailAndPassword(){this.currentUser={uid:'uid-login'};return {user:this.currentUser}},
    async signOut(){this.currentUser=null;return undefined}
  };
  const firebase={
    apps:[],
    initializeApp(){this.apps.push({});return this.apps[0]},
    auth(){return auth}
  };
  const context={console,localStorage,sessionStorage,firebase,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},addEventListener(){},dispatchEvent(){return true}};
  context.window=context;
  vm.runInNewContext(source,context);
  firebase.initializeApp({});
  const credential=await auth.signInWithEmailAndPassword('x','y');
  assert.equal(credential.user.uid,'uid-login');
  assert.equal(context.finalforgeAccountStorage.currentUid(),'uid-login');
  await auth.signOut();
  assert.equal(context.finalforgeAccountStorage.currentUid(),null);
  assert.equal(authListeners.length,1);
});

test('loader and service worker make account isolation deterministic and offline-available',()=>{
  const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
  const worker=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const account=loader.indexOf("loadScript('assets/account-storage-v1.js')");
  const app=loader.indexOf("loadScript('assets/app.js')");
  const auth=loader.indexOf("loadScript('assets/auth.js')");
  assert.ok(account>0&&account<app&&account<auth);
  assert.match(loader,/await firebaseSdkReady;\s*await loadScript\('assets\/account-storage-v1\.js'\)/);
  assert.match(worker,/\.\/assets\/account-storage-v1\.js/);
  assert.match(worker,/\/assets\/account-storage-v1\.js/);
});
