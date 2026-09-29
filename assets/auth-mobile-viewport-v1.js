/* FinalForge Auth Mobile Viewport v1 — event-driven keyboard/viewport recovery for auth forms. */
(()=>{
  'use strict';
  if(window.FINALFORGE_AUTH_MOBILE_VIEWPORT_V1)return;
  window.FINALFORGE_AUTH_MOBILE_VIEWPORT_V1=Object.freeze({version:'1.0.0'});

  const gate=document.getElementById('authGate');
  if(!gate)return;

  const narrow=()=>matchMedia('(max-width:600px)').matches;
  let queued=0;

  function keepVisible(target){
    if(!narrow()||!target||!gate.contains(target))return;
    if(!target.matches('input,textarea,select,button'))return;
    cancelAnimationFrame(queued);
    queued=requestAnimationFrame(()=>{
      const viewport=window.visualViewport;
      const top=viewport?viewport.offsetTop:0;
      const height=viewport?viewport.height:window.innerHeight;
      const bottom=top+height;
      const rect=target.getBoundingClientRect();
      const keyboardLikely=viewport&&viewport.height<window.innerHeight*0.88;
      const obscured=rect.bottom>bottom-24||rect.top<top+16;
      if(obscured||keyboardLikely){
        target.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
      }
    });
  }

  document.addEventListener('focusin',event=>{
    const target=event.target;
    if(gate.contains(target)){
      keepVisible(target);
      setTimeout(()=>keepVisible(target),180);
    }
  },{passive:true});

  gate.addEventListener('click',event=>{
    const control=event.target.closest('button,input,label');
    if(control)setTimeout(()=>keepVisible(document.activeElement),80);
  },{passive:true});

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>keepVisible(document.activeElement),{passive:true});
    window.visualViewport.addEventListener('scroll',()=>keepVisible(document.activeElement),{passive:true});
  }

  addEventListener('orientationchange',()=>setTimeout(()=>keepVisible(document.activeElement),120),{passive:true});
  addEventListener('pageshow',()=>keepVisible(document.activeElement),{passive:true});
})();
