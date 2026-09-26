/* FinalForge Session Restore v1 — prevent auth-screen flash while Firebase restores a saved session. */
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
