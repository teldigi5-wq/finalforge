/* FinalForge Session Restore v2 — prevent auth flash and keep manual login handoff single-owner. */
(() => {
  'use strict';

  const root=document.documentElement;
  const body=document.body;
  if(!body)return;

  let settled=false;
  let unsubscribe=null;
  let observer=null;

  const finish=()=>{
    if(settled)return;
    settled=true;
    root.classList.remove('ff-auth-restoring');
    try{unsubscribe?.()}catch{}
    observer?.disconnect();
  };

  if(!body.classList.contains('auth-pending') || document.querySelector('#verifyForm.active')){
    finish();
    return;
  }

  if(!window.firebase || !firebase.apps?.length){
    finish();
    return;
  }

  observer=new MutationObserver(()=>{
    if(!body.classList.contains('auth-pending')){
      finish();
      return;
    }
    if(document.querySelector('#verifyForm.active')) finish();
  });
  observer.observe(body,{attributes:true,attributeFilter:['class'],subtree:true});

  try{
    unsubscribe=firebase.auth().onAuthStateChanged(user=>{
      if(!user){
        finish();
        return;
      }
      if(!user.emailVerified){
        requestAnimationFrame(()=>{
          if(document.querySelector('#verifyForm.active')) finish();
        });
      }
    },()=>finish());
  }catch{
    finish();
  }

  /* Never leave authentication hidden forever if the network/auth backend stalls. */
  setTimeout(finish,10000);
})();

/* Manual login guard.
   auth.js already owns onAuthStateChanged and performs the security/profile checks.
   Do not run that same finalize path a second time from the form submit on mobile. */
(() => {
  'use strict';

  const form=document.getElementById('loginForm');
  const body=document.body;
  if(!form||!body||!window.firebase||form.dataset.ffLoginGuard==='1')return;
  form.dataset.ffLoginGuard='1';

  const auth=firebase.auth();
  const $=s=>document.querySelector(s);
  let inFlight=false;

  const normalizeStudentId=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'');
  const validStudentId=id=>/^IT\d{8}$/.test(normalizeStudentId(id));
  const studentEmail=id=>`${normalizeStudentId(id).toLowerCase()}@my.sliit.lk`;

  function setAlert(message,type='error'){
    const box=$('#authAlert');
    if(!box)return;
    box.hidden=!message;
    box.className=`auth-alert ${type}`;
    box.textContent=message||'';
  }

  function setBusy(on){
    form.classList.toggle('is-loading',!!on);
    form.setAttribute('aria-busy',String(!!on));
    form.querySelectorAll('button,input').forEach(el=>{el.disabled=!!on});
  }

  function activeRole(){
    return $('.auth-role-toggle button.active')?.dataset?.role==='admin'?'admin':'student';
  }

  function human(error){
    const code=String(error?.code||'');
    const message=String(error?.message||'Sign-in failed.');
    if(code.includes('user-not-found'))return 'Student ID not found. Check the ID or create an account first.';
    if(code.includes('wrong-password')||code.includes('invalid-credential'))return 'Student ID/email or password is incorrect.';
    if(code.includes('user-disabled'))return 'This account is disabled. Contact the FinalForge administrator.';
    if(code.includes('too-many-requests'))return 'Too many attempts. Wait a few minutes, then try again.';
    if(code.includes('network-request-failed'))return 'Network error. Check your connection and try again.';
    return message.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?$/,'');
  }

  function waitForHandoff(timeoutMs=18000){
    return new Promise((resolve,reject)=>{
      let done=false;
      let timer=0;
      let observer=null;

      const finish=(error,result)=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        observer?.disconnect();
        if(error)reject(error);else resolve(result);
      };

      const check=()=>{
        if(!body.classList.contains('auth-pending'))return finish(null,'app');
        if($('#verifyForm')?.classList.contains('active'))return finish(null,'verify');
        const alert=$('#authAlert');
        if(!auth.currentUser && alert && !alert.hidden && alert.textContent.trim()){
          return finish(new Error(alert.textContent.trim()));
        }
      };

      observer=new MutationObserver(check);
      observer.observe(body,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
      const alert=$('#authAlert');
      if(alert)observer.observe(alert,{attributes:true,attributeFilter:['hidden','class'],childList:true,subtree:true});

      timer=setTimeout(()=>finish(new Error('Secure sign-in is taking too long. Check your connection and try again.')),timeoutMs);
      check();
    });
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(inFlight)return;

    const role=activeRole();
    const identity=String($('#loginIdentity')?.value||'').trim();
    const password=String($('#loginPassword')?.value||'');
    if(role==='student'&&!validStudentId(identity))return setAlert('Enter a valid Student ID.');
    if(!password)return setAlert('Enter your password.');

    inFlight=true;
    setAlert('Signing you in securely…','success');
    setBusy(true);

    try{
      const remember=$('#rememberSession')?.checked!==false;
      if(auth.setPersistence){
        await auth.setPersistence(remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);
      }

      const email=role==='admin'?identity:studentEmail(identity);
      await auth.signInWithEmailAndPassword(email,password);

      /* auth.js onAuthStateChanged now performs the only profile/token finalization.
         Wait for that canonical path to either open the app or show verification. */
      await waitForHandoff();
    }catch(error){
      setAlert(human(error));
    }finally{
      inFlight=false;
      setBusy(false);
    }
  },true);
})();
