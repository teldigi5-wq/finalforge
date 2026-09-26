/* FinalForge Mobile Runtime Final v1 — detect real phones and fail-open hidden entrance states. */
(()=>{
  'use strict';

  const coarse=()=>matchMedia('(hover:none) and (pointer:coarse)').matches||matchMedia('(pointer:coarse)').matches;
  const narrowScreen=()=>{
    const w=Number(screen?.width||0),h=Number(screen?.height||0);
    const short=Math.min(w||9999,h||9999);
    return short<=900||matchMedia('(max-width:900px)').matches;
  };
  const realMobile=()=>narrowScreen()||((navigator.maxTouchPoints||0)>0&&coarse());

  function reveal(root=document){
    root.querySelectorAll?.('.ff-enter').forEach(el=>{
      el.classList.add('ff-entered');
      el.style.removeProperty('transition-delay');
    });
    root.querySelectorAll?.('.section.active.section-leaving').forEach(el=>el.classList.remove('section-leaving'));
  }

  function apply(){
    if(realMobile()) document.documentElement.classList.add('ff-real-mobile');
    if(!document.body?.classList.contains('auth-pending')) reveal(document);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  addEventListener('finalforge-ready',()=>{apply();setTimeout(apply,80);setTimeout(apply,420)});
  addEventListener('finalforge-mobile-navigate',apply);
  addEventListener('pageshow',apply,{passive:true});
  addEventListener('resize',apply,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});

  /* Dynamic cards can still arrive later, but ordinary class/style changes must not
     trigger a whole-document recovery pass on every navigation frame. */
  const app=document.querySelector('.app');
  if(app){
    let queued=false;
    new MutationObserver(mutations=>{
      if(!mutations.some(m=>m.addedNodes.length))return;
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;apply()});
    }).observe(app,{childList:true,subtree:true});
  }

  /* Desktop safeguard: entrance effects are optional; invisible content is never acceptable. */
  setTimeout(()=>{
    document.querySelectorAll('.ff-enter:not(.ff-entered)').forEach(el=>el.classList.add('ff-entered'));
  },1600);
})();
