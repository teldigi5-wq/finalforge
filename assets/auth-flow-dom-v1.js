/* FinalForge Auth Flow DOM v1 — small, one-shot markup normalization before auth binds. */
(()=>{
  'use strict';
  if(window.FINALFORGE_AUTH_FLOW_DOM_V1)return;
  window.FINALFORGE_AUTH_FLOW_DOM_V1=Object.freeze({version:'1.1.0'});

  /* Auth is assembled from several historical visual layers. Load the certified
     desktop + unified responsive contracts last so viewport behavior has one owner. */
  function ensureFinalStyle(id,href){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;
    link.rel='stylesheet';
    link.href=href;
    link.dataset.finalforgeAuthFinal='1';
    document.head.appendChild(link);
  }
  ensureFinalStyle('ff-auth-desktop-premium-v11','assets/auth-desktop-premium-v11.css?v=auth-responsive-v69');
  ensureFinalStyle('ff-auth-responsive-unified-v12','assets/auth-responsive-unified-v12.css?v=auth-responsive-v69');

  function install(){
    const signup=document.getElementById('signupForm');
    const derived=document.getElementById('derivedEmail');
    if(signup&&derived&&!document.getElementById('derivedEmailText')){
      const label=derived.closest('label');
      const identity=document.createElement('div');
      identity.className='ff-derived-identity';
      identity.setAttribute('aria-live','polite');
      identity.innerHTML='<span>SLIIT mailbox</span><strong id="derivedEmailText">Your SLIIT email will appear here</strong><small>FinalForge derives this automatically from your Student ID. You do not type or change it.</small>';
      if(label)label.replaceWith(identity);else signup.insertBefore(identity,signup.querySelector('.password-hint'));
    }

    const stepper=signup?.querySelector('.auth-stepper');
    if(stepper){
      stepper.innerHTML='<span class="active">1 Create</span><span>2 Verify · 20 min</span><span>3 Active</span>';
      stepper.setAttribute('aria-label','Registration steps');
    }

    signup?.querySelectorAll('.password-hint').forEach((node,index)=>{
      if(index===0)node.remove();
      else node.textContent='Use 8–128 characters. Your password is handled by Firebase Authentication, not stored in FinalForge files or Firestore.';
    });

    const verify=document.getElementById('verifyForm');
    if(verify&&!document.getElementById('verifyCountdown')){
      const copy=verify.querySelector('p');
      const timer=document.createElement('div');
      timer.id='verifyCountdown';
      timer.className='ff-verify-countdown';
      timer.setAttribute('role','timer');
      timer.setAttribute('aria-live','polite');
      timer.textContent='20:00 activation window';
      copy?.after(timer);
    }
    if(verify&&!document.getElementById('verifyRestartBtn')){
      const button=document.createElement('button');
      button.id='verifyRestartBtn';
      button.className='btn ff-restart-verification';
      button.type='button';
      button.hidden=true;
      button.textContent='Restart verification · 20 min';
      const resend=document.getElementById('verifyResendBtn');
      if(resend)resend.after(button);else verify.appendChild(button);
    }

    const security=document.querySelector('.ff-auth-security span');
    if(security)security.textContent='Student ID → SLIIT verification → account activation.';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();