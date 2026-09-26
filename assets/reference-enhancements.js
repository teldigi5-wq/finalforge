/* FinalForge reference enhancements — decorative desktop-only polish + optional paper loader. */
(()=>{
  'use strict';
  const q=(selector,root=document)=>root.querySelector(selector);
  const mobile=()=>typeof window.finalforgeIsMobile==='function'&&window.finalforgeIsMobile();

  function refresh(){
    document.documentElement.classList.add('ff-reference-ready');
    if(mobile())return;
    const hero=q('.hero-main');
    if(hero&&!q('.ff-hero-atmosphere',hero)){
      const layer=document.createElement('div');
      layer.className='ff-hero-atmosphere';
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML='<i></i><i></i><i></i>';
      hero.prepend(layer);
    }
    const brand=q('.auth-brand-panel');
    if(brand&&!q('.ff-auth-depth',brand)){
      const layer=document.createElement('div');
      layer.className='ff-auth-depth';
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML='<i></i><i></i>';
      brand.prepend(layer);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
  addEventListener('finalforge-ready',refresh,{once:true});
})();

/* Load the optional 2024-pattern DCN paper after the canonical practice runner exists. */
(()=>{
  if(document.querySelector('script[data-finalforge-dcn-2024]'))return;
  const s=document.createElement('script');
  s.src='assets/dcn-2024-pattern-v1.js?v=2';
  s.async=true;
  s.dataset.finalforgeDcn2024='2';
  s.onerror=()=>console.warn('[FinalForge] DCN 2024 pattern paper could not be loaded.');
  document.body.appendChild(s);
})();
