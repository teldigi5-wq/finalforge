/* FinalForge Signup Reliability v2 — scroll-safe account creation and verification recovery. */
(() => {
  'use strict';

  const gate=document.getElementById('authGate');
  const form=document.getElementById('signupForm');
  if(!gate||!form||!window.firebase)return;

  const auth=()=>firebase.auth();
  const $=s=>document.querySelector(s);
  const normalize=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,'');
  const valid=id=>/^IT\d{8}$/.test(normalize(id));
  const emailFor=id=>`${normalize(id).toLowerCase()}@my.sliit.lk`;

  const style=document.createElement('style');
  style.dataset.finalforgeSignupFix='2';
  style.textContent=`
    body.auth-pending .auth-card[data-mode="signup"]{
      justify-content:flex-start!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior:contain!important;
      padding-top:clamp(22px,3.2vh,34px)!important;
      padding-bottom:32px!important;
      scrollbar-width:thin!important;
      scrollbar-color:rgba(103,132,181,.38) transparent!important;
    }
    body.auth-pending .auth-card[data-mode="signup"]::-webkit-scrollbar{display:block!important;width:6px!important}
    body.auth-pending .auth-card[data-mode="signup"]::-webkit-scrollbar-thumb{background:rgba(103,132,181,.34)!important;border-radius:999px!important}
    body.auth-pending .auth-card[data-mode="signup"] .auth-tabs{flex:0 0 auto!important}
    body.auth-pending .auth-card[data-mode="signup"] #signupForm{flex:0 0 auto!important;padding-bottom:8px!important}
    body.auth-pending .auth-card[data-mode="signup"] .ff-auth-security{flex:0 0 auto!important}
    @media(min-width:981px) and (max-height:760px){
      body.auth-pending .auth-card[data-mode="signup"]{padding-top:18px!important;padding-bottom:22px!important}
      body.auth-pending .auth-card[data-mode="signup"] .ff-auth-intro{margin-bottom:10px!important}
      body.auth-pending .auth-card[data-mode="signup"] .auth-tabs{margin-bottom:9px!important}
      body.auth-pending .auth-card[data-mode="signup"] #signupForm label{margin-bottom:8px!important}
      body.auth-pending .auth-card[data-mode="signup"] .password-hint{margin:3px 0 8px!important}
    }
  `;
  document.head.appendChild(style);

  function alertMessage(message,type='error'){
    const box=$('#authAlert');
    if(!box)return;
    box.hidden=!message;
    box.className=`auth-alert ${type}`;
    box.textContent=message||'';
  }

  function busy(on){
    form.classList.toggle('is-loading',!!on);
    form.setAttribute('aria-busy',String(!!on));
    form.querySelectorAll('button,input').forEach(el=>{el.disabled=!!on});
  }

  function human(error){
    const code=String(error?.code||'');
    const message=String(error?.message||'Signup failed.');
    if(code.includes('invalid-credential')||code.includes('wrong-password'))return 'This Student ID already has an account, but that password does not match. Log in or reset the password.';
    if(code.includes('too-many-requests'))return 'Too many attempts. Wait a few minutes, then try again.';
    if(code.includes('network-request-failed'))return 'Network error. Check your connection and try again.';
    if(code.includes('unauthorized-domain'))return 'This site address is not authorized for Firebase verification yet.';
    return message.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?$/,'');
  }

  async function jsonResponse(response){
    const text=await response.text();
    if(!text)return {};
    try{return JSON.parse(text)}catch{return {error:response.ok?'Unexpected signup response.':'Signup service returned an invalid response.'}}
  }

  function continueUrl(){
    return `${location.origin}${location.pathname}?verified=1`;
  }

  async function sendVerification(user){
    try{
      await user.sendEmailVerification({url:continueUrl(),handleCodeInApp:false});
    }catch(error){
      if(['auth/unauthorized-continue-uri','auth/invalid-continue-uri','auth/missing-continue-uri'].includes(error?.code)){
        await user.sendEmailVerification();
        return;
      }
      throw error;
    }
  }

  async function sendReset(email){
    try{
      await auth().sendPasswordResetEmail(email,{url:`${location.origin}${location.pathname}`});
    }catch(error){
      if(['auth/unauthorized-continue-uri','auth/invalid-continue-uri','auth/missing-continue-uri'].includes(error?.code)){
        await auth().sendPasswordResetEmail(email);
        return;
      }
      throw error;
    }
  }

  function verificationView(user,id,message){
    localStorage.setItem('finalforge_pending_student',id);
    window.showAuthView?.('verify');
    const email=$('#verifyEmail');if(email)email.textContent=user?.email||emailFor(id);
    alertMessage(message||`Verification email sent to ${emailFor(id)}. Open that SLIIT mailbox and verify the account.`,'success');
  }

  const originalShow=window.showAuthView;
  if(typeof originalShow==='function'){
    window.showAuthView=function(name){
      originalShow(name);
      const card=gate.querySelector('.auth-card');
      if(card){card.dataset.mode=name;requestAnimationFrame(()=>{card.scrollTop=0})}
      if(name==='signup')requestAnimationFrame(()=>$('#signupStudentId')?.focus({preventScroll:true}));
    };
  }

  $('#signupStudentId')?.addEventListener('input',e=>{
    const id=normalize(e.target.value);
    const feedback=$('#signupStudentIdFeedback');
    if(!feedback)return;
    if(!id){feedback.textContent='';return;}
    feedback.textContent=valid(id)?`SLIIT email: ${emailFor(id)}`:'Use your Student ID in the form IT26xxxxxxxx.';
    feedback.classList.toggle('is-valid',valid(id));
  });

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    alertMessage('');

    const id=normalize($('#signupStudentId')?.value);
    const password=$('#signupPassword')?.value||'';
    const confirm=$('#signupPassword2')?.value||'';
    if(!valid(id))return alertMessage('Enter a valid Student ID such as IT26xxxxxxxx.');
    if(password.length<8)return alertMessage('Password must contain at least 8 characters.');
    if(password!==confirm)return alertMessage('Passwords do not match.');

    busy(true);
    try{
      const response=await fetch('/api/signup',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({studentId:id,password})
      });
      const result=await jsonResponse(response);

      if(response.ok){
        const credential=await auth().signInWithEmailAndPassword(emailFor(id),password);
        await sendVerification(credential.user);
        verificationView(credential.user,id);
        return;
      }

      if(response.status===409){
        try{
          const credential=await auth().signInWithEmailAndPassword(emailFor(id),password);
          if(credential.user.emailVerified){
            alertMessage('This account is already verified. Signing you in…','success');
            return;
          }
          await sendVerification(credential.user);
          verificationView(credential.user,id,'Your account already existed but was still waiting for verification. A new verification email has been sent.');
          return;
        }catch(error){
          throw Object.assign(error,{message:human(error)});
        }
      }

      throw new Error(result.error||'Signup is temporarily unavailable.');
    }catch(error){
      alertMessage(human(error));
    }finally{
      busy(false);
    }
  },true);

  $('#verifyResendBtn')?.addEventListener('click',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const user=auth().currentUser;
    if(!user)return window.showAuthView?.('login');
    try{
      await sendVerification(user);
      alertMessage(`Verification email resent to ${user.email}.`,'success');
    }catch(error){alertMessage(human(error))}
  },true);

  $('#resetForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    const resetForm=event.currentTarget;
    const id=normalize($('#resetStudentId')?.value);
    if(!valid(id))return alertMessage('Enter a valid Student ID.');
    resetForm.querySelectorAll('button,input').forEach(el=>{el.disabled=true});
    resetForm.classList.add('is-loading');
    try{
      await sendReset(emailFor(id));
      alertMessage(`Password reset email sent to ${emailFor(id)}.`,'success');
    }catch(error){alertMessage(human(error))}
    finally{
      resetForm.classList.remove('is-loading');
      resetForm.querySelectorAll('button,input').forEach(el=>{el.disabled=false});
    }
  },true);
})();
