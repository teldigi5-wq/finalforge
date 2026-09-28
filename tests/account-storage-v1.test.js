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

function boot(shared=new Map(),sessionBacking=new Map(),{withFrames=false}={}){
  const localStorage=storageFacade(shared),sessionStorage=storageFacade(sessionBacking);
  const listeners=new Map();
  const frames=[];
  let renders=0;
  const context={
    console,localStorage,sessionStorage,
    CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail}},
    addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list)},
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true},
    renderModules(){renders++},renderHome(){renders++},renderPlanner(){renders++},renderPractice(){renders++}
  };
  if(withFrames)context.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
  context.window=context;
  vm.runInNewContext(source,context);
  return {context,localStorage,sessionStorage,shared,sessionBacking,listeners,frames,get renders(){return renders}};
}

test('account storage parses and declares explicit auth ownership',()=>{
  assert.doesNotThrow(()=>new Function(source));
  assert.match(source,/authBinding:'explicit'/);
  assert.doesNotMatch(source,/onAuthStateChanged\s*\(/);
  assert.doesNotMatch(source,/signInWithEmailAndPassword\s*=/);
});

test('unowned legacy study state is quarantined and hidden before binding',()=>{
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
  assert.equal(context.finalforgeAccountStorage.currentUid(),null);
  assert.ok(JSON.parse(shared.get('ff_legacy_unowned_v1')).data.finalforge_progress);
});

test('two users on one origin cannot read each other study state',()=>{
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
});

test('device preferences remain global and pending student state is tab scoped',()=>{
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

test('future finalforge keys default to account scope',()=>{
  const shared=new Map();
  const a=boot(shared),b=boot(shared);
  a.context.finalforgeAccountStorage.bind('uid-A');
  b.context.finalforgeAccountStorage.bind('uid-B');
  a.localStorage.setItem('finalforge_future_notes','private');
  assert.equal(a.localStorage.getItem('finalforge_future_notes'),'private');
  assert.equal(b.localStorage.getItem('finalforge_future_notes'),null);
});

test('unbind hides account state without deleting owner partition',()=>{
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

test('binding does not synchronously run heavy application renderers',()=>{
  const a=boot(new Map(),new Map(),{withFrames:true});
  a.context.finalforgeAccountStorage.bind('uid-A');
  assert.equal(a.renders,0);
  assert.ok(a.frames.length>=1);
  while(a.frames.length){
    const fn=a.frames.shift();
    fn();
  }
  assert.equal(a.renders,4);
});

test('local account autosave writes do not force full UI rerenders',()=>{
  const a=boot(new Map(),new Map(),{withFrames:true});
  a.context.finalforgeAccountStorage.bind('uid-A');
  while(a.frames.length)a.frames.shift()();
  const before=a.renders;
  a.localStorage.setItem('finalforge_exam_v4_active','{"answers":{"q1":"typing"}}');
  assert.equal(a.renders,before);
});

test('Firebase methods are left untouched; Auth Runtime v2 binds only after entitlement success',async()=>{
  const shared=new Map();
  const localStorage=storageFacade(shared),sessionStorage=storageFacade(new Map());
  const authListeners=[];
  const auth={
    onAuthStateChanged(fn){authListeners.push(fn);return()=>{}},
    async signInWithEmailAndPassword(){return {user:{uid:'uid-login'}}},
    async signOut(){return undefined}
  };
  const firebase={apps:[],initializeApp(){this.apps.push({});return this.apps[0]},auth(){return auth}};
  const originalInit=firebase.initializeApp;
  const originalSignIn=auth.signInWithEmailAndPassword;
  const context={console,localStorage,sessionStorage,firebase,CustomEvent:class{},addEventListener(){},dispatchEvent(){return true}};
  context.window=context;
  vm.runInNewContext(source,context);
  assert.equal(firebase.initializeApp,originalInit);
  assert.equal(auth.signInWithEmailAndPassword,originalSignIn);
  assert.equal(authListeners.length,0);
  await auth.signInWithEmailAndPassword('x','y');
  assert.equal(context.finalforgeAccountStorage.currentUid(),null);
  context.finalforgeAccountStorage.bind('uid-login');
  assert.equal(context.finalforgeAccountStorage.currentUid(),'uid-login');
});

test('loader and service worker keep account isolation available before auth runtime',()=>{
  const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
  const worker=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const account=loader.indexOf("loadScript('assets/account-storage-v1.js')");
  const app=loader.indexOf("loadScript('assets/app.js')");
  const auth=loader.indexOf("loadScript('assets/auth.js')");
  assert.ok(account>0&&account<app&&account<auth);
  assert.match(worker,/\.\/assets\/account-storage-v1\.js/);
  assert.match(worker,/\/assets\/account-storage-v1\.js/);
});
