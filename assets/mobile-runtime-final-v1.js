/* FinalForge Mobile Runtime Final v4 — one device policy for signed-in runtime. */
(()=>{
  'use strict';

  const compactScreen=()=>{
    const viewport=Number(window.innerWidth||document.documentElement.clientWidth||9999);
    if(viewport<=900||matchMedia('(max-width:900px)').matches)return true;
    const sw=Number(screen?.width||0),sh=Number(screen?.height||0);
    const physicalShort=Math.min(sw||9999,sh||9999);
    const handheldTouch=(navigator.maxTouchPoints||0)>0&&matchMedia('(hover:none) and (pointer:coarse)').matches;
    return handheldTouch&&physicalShort<=640;
  };
  const realMobile=()=>compactScreen();

  window.finalforgeIsMobile=realMobile;

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
    }else if(!document.body?.classList.contains('auth-pending')){
      reveal(document);
    }
    return mobile;
  }

  window.finalforgeApplyDeviceMode=apply;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  addEventListener('finalforge-ready',()=>{apply();setTimeout(apply,80)});
  addEventListener('pageshow',apply,{passive:true});
  addEventListener('resize',apply,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(apply,80),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});

  setTimeout(()=>{if(realMobile())reveal(document)},1200);
})();
