/* FinalForge Verification Handoff v1 — mobile return/focus recovery after Firebase email verification. */
(() => {
  'use strict';

  const $=s=>document.querySelector(s);
  const verifyForm=$('#verifyForm');
  const verifyBtn=$('#verifyCheckBtn');
  if(!verifyForm||!verifyBtn||!window.firebase)return;

  let checking=false;
  let lastCheck=0;
  let timer=null;
  let completed=false;

  const isVerifyView=()=>verifyForm.classList.contains('active')&&document.body.classList.contains('auth-pending');

  function setMessage(message,type='success'){
    const box=$('#authAlert');
    if(!box)return;
    box.hidden=!message;
    box.className=`auth-alert ${type}`;
    box.textContent=message||'';
  }

  async function checkVerified(reason='resume'){
    if(completed||checking||!isVerifyView())return false;
    if(document.visibilityState==='hidden')return false;
    const now=Date.now();
    if(now-lastCheck<1200)return false;
    lastCheck=now;
    const user=firebase.auth().currentUser;
    if(!user)return false;

    checking=true;
    try{
      await user.reload();
      const fresh=firebase.auth().currentUser;
      if(fresh?.emailVerified){
        completed=true;
        clearInterval(timer);
        setMessage('Email verified. Finishing your FinalForge sign-in…','success');
        setTimeout(()=>verifyBtn.click(),120);
        return true;
      }
      if(reason==='return')setMessage('Verification has not reached this session yet. If you already tapped the email link, wait a moment and return here again.','error');
    }catch(error){
      if(reason==='return')setMessage('Could not refresh verification status. Check your connection and try again.','error');
    }finally{
      checking=false;
    }
    return false;
  }

  function startPolling(){
    clearInterval(timer);
    timer=setInterval(()=>{
      if(isVerifyView()&&document.visibilityState==='visible')checkVerified('poll');
    },4000);
  }

  addEventListener('focus',()=>setTimeout(()=>checkVerified('return'),250));
  addEventListener('pageshow',()=>setTimeout(()=>checkVerified('return'),250));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(()=>checkVerified('return'),250);
  });

  const observer=new MutationObserver(()=>{
    if(isVerifyView()){
      startPolling();
      setTimeout(()=>checkVerified('poll'),300);
    }else clearInterval(timer);
  });
  observer.observe(verifyForm,{attributes:true,attributeFilter:['class']});

  const params=new URLSearchParams(location.search);
  if(params.get('verified')==='1'){
    setTimeout(()=>checkVerified('return'),350);
    try{
      params.delete('verified');
      const query=params.toString();
      history.replaceState(null,'',`${location.pathname}${query?`?${query}`:''}${location.hash}`);
    }catch{}
  }

  const help=document.createElement('div');
  help.className='ff-mobile-verify-return-help';
  help.innerHTML='<strong>On your phone:</strong> open the email link, complete verification, then return to this FinalForge tab. We will detect it automatically.';
  const existingHelp=verifyForm.querySelector('.ff-verify-help');
  if(existingHelp)existingHelp.insertAdjacentElement('afterend',help);
  else verifyBtn.insertAdjacentElement('beforebegin',help);

  const style=document.createElement('style');
  style.dataset.finalforgeVerifyHandoff='1';
  style.textContent=`
    .ff-mobile-verify-return-help{margin:.7rem 0;padding:.78rem .9rem;border:1px solid rgba(76,170,255,.2);border-radius:.85rem;background:rgba(53,116,185,.09);color:#a9bfd7;font-size:.77rem;line-height:1.5}
    .ff-mobile-verify-return-help strong{color:#dcecff}
    html[data-theme="light"] .ff-mobile-verify-return-help{background:#eef6ff;border-color:#cfe1f2;color:#60758d}
    html[data-theme="light"] .ff-mobile-verify-return-help strong{color:#24415f}
    @media(max-width:900px){.ff-mobile-verify-return-help{font-size:.8rem;margin:.75rem 0}}
  `;
  document.head.appendChild(style);

  if(isVerifyView()){
    startPolling();
    setTimeout(()=>checkVerified('poll'),300);
  }
})();
