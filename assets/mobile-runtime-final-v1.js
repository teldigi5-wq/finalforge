/* FinalForge Mobile Runtime Final v2 — detect compact phone/tablet screens without misclassifying touch PCs. */
(()=>{
  'use strict';

  const compactScreen=()=>{
    const sw=Number(screen?.width||0),sh=Number(screen?.height||0);
    const physicalShort=Math.min(sw||9999,sh||9999);
    const viewport=Number(window.innerWidth||document.documentElement.clientWidth||9999);
    return physicalShort<=900||viewport<=900||matchMedia('(max-width:900px)').matches;
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

    /* Hybrid/touch Windows laptops can expose coarse pointers. If the screen is not
       actually compact, explicitly clear every phone-only runtime state so desktop
       cannot remain trapped in the mobile shell after resize/navigation. */
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
