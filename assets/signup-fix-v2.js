/* FinalForge Signup Reliability v3 — explicit SLIIT email, delivery-aware verification recovery. */
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
  const normalizeEmail=v=>String(v||'').trim().toLowerCase();
  let lastAutofill='';
  let resendLocked=false;

  const style=document.createElement('style');
  style.dataset.finalforgeSignupFix='3';
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
    .ff-email-help{margin:.35rem 0 .85rem;padding:.7rem .8rem;border-radius:.8rem;border:1px solid rgba(113,145,188,.2);background:rgba(76,111,165,.08);color:#9fb3c9;font-size:.76rem;line-height:1.45}
    .ff-email-help b{color:inherit}
    .ff-verify-help{margin:.9rem 0;padding:.8rem .9rem;border-radius:.85rem;border:1px solid rgba(103,145,196,.2);background:rgba(68,105,158,.09);font-size:.78rem;line-height:1.5}
    .ff-verify-help strong{display:block;margin-bottom:.2rem}
    @media(min-width:981px) and (max-height:760px){
      body.auth-pending .auth-card[data-mode="signup"]{padding-top:18px!important;padding-bottom:22px!important}
      body.auth-pending .auth-card[data-mode="signup"] .ff-auth-intro{margin-bottom:10px!important}
      body.auth-pending .auth-card[data-mode="signup"] .auth-tabs{margin-bottom:9px!important}
      body.auth-pending .auth-card[data-mode="signup"] #signupForm label{margin-bottom:8px!important}
      body.auth-pending .auth-card[data-mode="signup"] .password-hint{margin:3px 0 8px!important}
    }
  `;
  document.head.appendChild(style);

  const emailInput=$('#derivedEmail');
  if(emailInput){
    emailInput.readOnly=false;
    emailInput.removeAttribute('readonly');
    emailInput.autocomplete='email';
    emailInput.placeholder='it26xxxxxx@my.sliit.lk';
    emailInput.setAttribute('aria-describedby','signupEmailFeedback');
    const label=emailInput.closest('label');
    if(label){
      const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(text)text.textContent='Your SLIIT email';
      if(!$('#signupEmailFeedback'))label.insertAdjacentHTML('beforeend','<small class="ff-field-feedback" id="signupEmailFeedback" aria-live="polite"></small>');
    }
    const oldHint=form.querySelector('.password-hint');
    if(oldHint)oldHint.innerHTML='Enter the <b>SLIIT mailbox you can actually open</b>. It must match your Student ID, for example <b>IT26111111 → it26111111@my.sliit.lk</b>.';
  }

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
    if(code.includes('too-many-requests'))return 'Too many verification attempts. Wait a few minutes before trying again.';
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

  function ensureVerificationHelp(){
    const verify=$('#verifyForm');
    if(!verify||verify.querySelector('.ff-verify-help'))return;
    const resend=$('#verifyResendBtn');
    const help=document.createElement('div');
    help.className='ff-verify-help';
    help.innerHTML='<strong>No email yet?</strong>Wait 1–2 minutes, then check Inbox, Junk/Spam and search your mailbox for “Firebase” or “FinalForge”. If nothing arrives, use Resend verification email.';
    resend?.insertAdjacentElement('beforebegin',help);
  }

  function verificationView(user,id,message){
    localStorage.setItem('finalforge_pending_student',id);
    window.showAuthView?.('verify');
    const email=$('#verifyEmail');if(email)email.textContent=user?.email||emailFor(id);
    ensureVerificationHelp();
    alertMessage(message||`Verification request accepted for ${user?.email||emailFor(id)}. Check that SLIIT mailbox, including Junk/Spam.`,'success');
  }

  const originalShow=window.showAuthView;
  if(typeof originalShow==='function'){
    window.showAuthView=function(name){
      originalShow(name);
      const card=gate.querySelector('.auth-card');
      if(card){card.dataset.mode=name;requestAnimationFrame(()=>{card.scrollTop=0})}
      if(name==='signup')requestAnimationFrame(()=>$('#signupStudentId')?.focus({preventScroll:true}));
      if(name==='verify')ensureVerificationHelp();
    };
  }

  function updateEmailState(){
    const id=normalize($('#signupStudentId')?.value);
    const feedback=$('#signupStudentIdFeedback');
    const mailFeedback=$('#signupEmailFeedback');
    const expected=valid(id)?emailFor(id):'';
    if(feedback){
      feedback.textContent=!id?'':valid(id)?`Expected SLIIT email: ${expected}`:'Use your Student ID in the form IT26xxxxxxxx.';
      feedback.classList.toggle('is-valid',valid(id));
    }
    if(emailInput&&expected){
      const current=normalizeEmail(emailInput.value);
      if(!current||current===lastAutofill){emailInput.value=expected;lastAutofill=expected;}
    }
    if(mailFeedback){
      const current=normalizeEmail(emailInput?.value);
      if(!current){mailFeedback.textContent='Enter your SLIIT email address.';mailFeedback.dataset.state='';}
      else if(!expected){mailFeedback.textContent='Enter a valid Student ID first.';mailFeedback.dataset.state='error';}
      else if(current!==expected){mailFeedback.textContent=`Email must be ${expected}`;mailFeedback.dataset.state='error';}
      else{mailFeedback.textContent='Student ID and SLIIT email match.';mailFeedback.dataset.state='valid';}
    }
  }

  $('#signupStudentId')?.addEventListener('input',updateEmailState);
  emailInput?.addEventListener('input',updateEmailState);
  updateEmailState();

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    alertMessage('');

    const id=normalize($('#signupStudentId')?.value);
    const sliitEmail=normalizeEmail(emailInput?.value);
    const expected=valid(id)?emailFor(id):'';
    const password=$('#signupPassword')?.value||'';
    const confirm=$('#signupPassword2')?.value||'';

    if(!valid(id))return alertMessage('Enter a valid Student ID such as IT26xxxxxxxx.');
    if(!sliitEmail)return alertMessage('Enter your SLIIT email address.');
    if(sliitEmail!==expected)return alertMessage(`Your SLIIT email must match your Student ID: ${expected}`);
    if(password.length<8)return alertMessage('Password must contain at least 8 characters.');
    if(password!==confirm)return alertMessage('Passwords do not match.');

    busy(true);
    try{
      const response=await fetch('/api/signup',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({studentId:id,sliitEmail,password})
      });
      const result=await jsonResponse(response);

      if(response.ok){
        const credential=await auth().signInWithEmailAndPassword(sliitEmail,password);
        await sendVerification(credential.user);
        verificationView(credential.user,id);
        return;
      }

      if(response.status===409){
        try{
          const credential=await auth().signInWithEmailAndPassword(sliitEmail,password);
          if(credential.user.emailVerified){
            alertMessage('This account is already verified. Use Log in to continue.','success');
            return;
          }
          await sendVerification(credential.user);
          verificationView(credential.user,id,'This account already exists but is not verified. A fresh verification request was accepted. Check Inbox and Junk/Spam.');
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
    if(resendLocked)return alertMessage('Please wait a minute before requesting another verification email.');
    try{
      resendLocked=true;
      await sendVerification(user);
      alertMessage(`A new verification request was accepted for ${user.email}. Check Inbox and Junk/Spam.`,'success');
      const btn=$('#verifyResendBtn');
      if(btn){btn.disabled=true;let left=60;const original=btn.textContent;btn.textContent=`Resend available in ${left}s`;const t=setInterval(()=>{left--;if(left<=0){clearInterval(t);resendLocked=false;btn.disabled=false;btn.textContent=original}else btn.textContent=`Resend available in ${left}s`},1000)}
      else setTimeout(()=>{resendLocked=false},60000);
    }catch(error){resendLocked=false;alertMessage(human(error))}
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
      alertMessage(`Password reset request accepted for ${emailFor(id)}. Check Inbox and Junk/Spam.`,'success');
    }catch(error){alertMessage(human(error))}
    finally{
      resetForm.classList.remove('is-loading');
      resetForm.querySelectorAll('button,input').forEach(el=>{el.disabled=false});
    }
  },true);
})();
