/* FinalForge Mobile Runtime Final v3 — compact viewport + phone-size fallback without misclassifying touch PCs. */
(()=>{
  'use strict';

  const compactScreen=()=>{
    const viewport=Number(window.innerWidth||document.documentElement.clientWidth||9999);
    if(viewport<=900||matchMedia('(max-width:900px)').matches)return true;

    /* Android "Desktop site" can report a ~980px layout viewport. Only fall back to
       physical screen size for a genuinely phone-sized coarse/touch device. A
       1366x768 or 1536x864 Windows touch laptop must stay desktop. */
    const sw=Number(screen?.width||0),sh=Number(screen?.height||0);
    const physicalShort=Math.min(sw||9999,sh||9999);
    const handheldTouch=(navigator.maxTouchPoints||0)>0&&matchMedia('(hover:none) and (pointer:coarse)').matches;
    return handheldTouch&&physicalShort<=640;
  };
  const realMobile=()=>compactScreen();

  function reveal(root=document){
    root.querySelectorAll?.('.ff-enter').forEach(el=>{
      el.classList.add('ff-entered');
      el.style.removeProperty('transition-delay');
    });
    root.querySelectorAll?.('.section.active.section-leaving').forEach(el=>el.classList.remove('section-leaving'));
  }

  function apply(){
    const html=document.documentElement;
    const mobile=realMobile();
    html.classList.toggle('ff-real-mobile',mobile);

    if(!mobile){
      html.classList.remove('ff-scroll-free','ff-scroll-locked');
      document.body?.classList.remove('mobile-nav-more-open');
      window.closeMobileNavMore?.();
    }

    if(!document.body?.classList.contains('auth-pending')) reveal(document);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  addEventListener('finalforge-ready',()=>{apply();setTimeout(apply,80);setTimeout(apply,420)});
  addEventListener('finalforge-mobile-navigate',apply);
  addEventListener('pageshow',apply,{passive:true});
  addEventListener('resize',apply,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(apply,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});

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

  setTimeout(()=>{
    document.querySelectorAll('.ff-enter:not(.ff-entered)').forEach(el=>el.classList.add('ff-entered'));
  },1600);
})();
