import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('verified session removes login from layout and sign-out restores it',async()=>{
  const element=()=>{
    const classes=new Set();
    return {hidden:false,textContent:'',innerHTML:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},addEventListener(){}};
  };
  const elements=new Map(['#authGate','#accountPrimary','#accountSecondary','#accountChip .account-avatar','#accountMenuBody'].map(id=>[id,element()]));
  const body=element();body.classList.add('auth-pending');
  let onSession,scroll;
  const auth={onAuthStateChanged:callback=>{onSession=callback}};
  const context={console,location:{protocol:'https:',hostname:'example.test'},localStorage:{setItem(){},getItem(){return null}},document:{body,querySelector:id=>elements.get(id)||null,querySelectorAll:()=>[],addEventListener(){}},addEventListener(){},setTimeout,clearTimeout};
  context.window=context;
  context.scrollTo=options=>{scroll=options};
  context.FINALFORGE_FIREBASE={enabled:true,config:{}};
  context.firebase={initializeApp(){},auth:()=>auth,firestore:()=>({})};
  vm.runInNewContext(read('assets/auth.js'),context);
  await onSession({email:'test@example.test',getIdTokenResult:async()=>({claims:{admin:true,email_verified:true}})});
  assert.equal(body.classList.contains('auth-pending'),false);
  assert.equal(elements.get('#authGate').hidden,true);
  assert.equal(elements.get('#authGate').classList.contains('hidden'),true);
  assert.equal(scroll.top,0);
  await onSession(null);
  assert.equal(body.classList.contains('auth-pending'),true);
  assert.equal(elements.get('#authGate').hidden,false);
  assert.equal(elements.get('#authGate').classList.contains('hidden'),false);
});

test('final login structure and styles exist before application boot',()=>{
  const html=read('index.html'),head=html.split('</head>')[0],loader=read('assets/core-loader.js');
  assert.equal((html.match(/id="authGate"/g)||[]).length,1);
  assert.equal((html.match(/class="ff-auth-intro"/g)||[]).length,1);
  assert.ok(html.includes('class="ff-auth-brandbar"'));
  assert.ok(html.includes('class="ff-auth-brandcontent"'));
  assert.ok(head.includes('assets/reference-refresh.css?v=single-surface-8'));
  assert.ok(!html.includes('class="auth-backdrop"'));
  assert.ok(!loader.includes("loadScript('assets/auth-premium-v5.js')"));
  assert.ok(!loader.includes("b['experience.js']"));
  assert.ok(!loader.includes('critical.textContent'));
  assert.match(read('assets/reference-refresh.css'),/#authGate\.hidden,#authGate\[hidden\],body:not\(\.auth-pending\) #authGate\{display:none!important\}/);
});

test('failed login releases controls after the event currentTarget is cleared',async()=>{
  let submit;
  const controls=[{disabled:false},{disabled:false}];
  const form={classList:{toggle(){}},setAttribute(){},querySelectorAll:()=>controls,addEventListener:(type,callback)=>{submit=callback}};
  const elements=new Map([['#loginForm',form],['#loginIdentity',{value:'invalid-id'}],['#loginPassword',{value:'test-only'}]]);
  const context={console,location:{protocol:'https:',hostname:'example.test'},localStorage:{setItem(){}},document:{querySelector:id=>elements.get(id)||null,querySelectorAll:()=>[],addEventListener(){}},addEventListener(){},setTimeout,clearTimeout};
  context.window=context;
  context.FINALFORGE_FIREBASE={enabled:true,config:{}};
  context.firebase={initializeApp(){},auth:()=>({onAuthStateChanged(){}}),firestore:()=>({})};
  vm.runInNewContext(read('assets/auth.js'),context);
  const event={preventDefault(){},currentTarget:form};
  const result=submit(event);
  assert.ok(controls.every(control=>control.disabled));
  // Browsers clear currentTarget when synchronous event dispatch completes.
  event.currentTarget=null;
  await result;
  assert.ok(controls.every(control=>!control.disabled));
});
