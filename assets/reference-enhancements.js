/* FinalForge reference experience enhancements.
   Performance pass: preserve atmosphere/reveal styling, remove duplicate pointer-follow depth work. */
(()=>{
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Depth-card pointer tracking duplicated the main motion layer and caused extra RAF work. */
  const precise=false;
  const wired=new WeakSet();

  function addAtmosphere(){
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

  function wireDepthCard(card,index){
    if(!precise||reduce||wired.has(card))return;
    wired.add(card);
    card.classList.add('ff-depth-card');
    card.style.setProperty('--ff-depth-delay',`${Math.min(index,8)*35}ms`);
  }

  function enhanceCards(){
    qa('.quick-dock>button,.module-card,.resource,.stat,.planner-card,.exam-card,.paper-card')
      .slice(0,32)
      .forEach(wireDepthCard);
  }

  function markLoaded(){
    document.documentElement.classList.add('ff-reference-ready');
  }

  function refresh(){
    addAtmosphere();
    enhanceCards();
    markLoaded();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
  addEventListener('finalforge-ready',refresh,{once:true});

  /* Keep dynamic content support but collapse bursts into one idle refresh. */
  let queued=false;
  new MutationObserver(mutations=>{
    if(document.body.classList.contains('auth-pending')||queued||!mutations.some(item=>item.addedNodes.length))return;
    queued=true;
    const run=()=>{queued=false;enhanceCards()};
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:180});
    else setTimeout(run,80);
  }).observe(q('.app'),{childList:true,subtree:true});
})();

/* Load the optional 2024-pattern DCN paper after the canonical practice runner exists. */
(()=>{
  if(document.querySelector('script[data-finalforge-dcn-2024]'))return;
  const s=document.createElement('script');
  s.src='assets/dcn-2024-pattern-v1.js?v=1';
  s.async=true;
  s.dataset.finalforgeDcn2024='1';
  s.onerror=()=>console.warn('[FinalForge] DCN 2024 pattern paper could not be loaded.');
  document.body.appendChild(s);
})();

/* Signup reliability patch: loaded after auth.js so it can safely harden the existing flow. */
(()=>{
  if(document.querySelector('script[data-finalforge-signup-fix]'))return;
  const s=document.createElement('script');
  s.src='assets/signup-fix-v2.js?v=3';
  s.async=false;
  s.dataset.finalforgeSignupFix='3';
  s.onerror=()=>console.warn('[FinalForge] Signup reliability patch could not be loaded.');
  document.body.appendChild(s);
})();

/* Mobile verification handoff: automatically re-check when the student returns from the email/Firebase tab. */
(()=>{
  if(document.querySelector('script[data-finalforge-verification-handoff]'))return;
  const s=document.createElement('script');
  s.src='assets/verification-handoff-v1.js?v=1';
  s.async=false;
  s.dataset.finalforgeVerificationHandoff='1';
  s.onerror=()=>console.warn('[FinalForge] Verification handoff guard could not be loaded.');
  document.body.appendChild(s);
})();

/* Runtime stability layer: final CSS specificity correction + Practice navigation guard. */
(()=>{
  if(!document.querySelector('link[data-finalforge-runtime-stability]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/runtime-stability-v1.css?v=1';
    link.dataset.finalforgeRuntimeStability='1';
    document.head.appendChild(link);
  }
  if(document.querySelector('script[data-finalforge-practice-stability]'))return;
  const s=document.createElement('script');
  s.src='assets/practice-stability-v1.js?v=1';
  s.async=false;
  s.dataset.finalforgePracticeStability='1';
  s.onerror=()=>console.warn('[FinalForge] Practice stability guard could not be loaded.');
  document.body.appendChild(s);
})();

/* Final mobile runtime layer: must load after every other visual/motion layer. */
(()=>{
  if(!document.querySelector('link[data-finalforge-mobile-runtime-final]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/mobile-runtime-final-v1.css?v=1';
    link.dataset.finalforgeMobileRuntimeFinal='1';
    document.head.appendChild(link);
  }
  if(document.querySelector('script[data-finalforge-mobile-runtime-final]'))return;
  const s=document.createElement('script');
  s.src='assets/mobile-runtime-final-v1.js?v=2';
  s.async=false;
  s.dataset.finalforgeMobileRuntimeFinal='2';
  s.onerror=()=>console.warn('[FinalForge] Final mobile runtime recovery could not be loaded.');
  document.body.appendChild(s);
})();

/* Mobile scroll recovery: unlock stale Android body locks while preserving real open overlays. */
(()=>{
  if(!document.querySelector('link[data-finalforge-mobile-scroll-recovery]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/mobile-scroll-recovery-v1.css?v=1';
    link.dataset.finalforgeMobileScrollRecovery='1';
    document.head.appendChild(link);
  }
  if(document.querySelector('script[data-finalforge-mobile-scroll-recovery]'))return;
  const s=document.createElement('script');
  s.src='assets/mobile-scroll-recovery-v1.js?v=2';
  s.async=false;
  s.dataset.finalforgeMobileScrollRecovery='2';
  s.onerror=()=>console.warn('[FinalForge] Mobile scroll recovery could not be loaded.');
  document.body.appendChild(s);
})();

/* Atomic mobile navigation: final runtime owner of phone section changes. */
(()=>{
  if(document.querySelector('script[data-finalforge-mobile-navigation-v2]'))return;
  const s=document.createElement('script');
  s.src='assets/mobile-navigation-runtime-v2.js?v=1';
  s.async=false;
  s.dataset.finalforgeMobileNavigationV2='1';
  s.onerror=()=>console.warn('[FinalForge] Mobile navigation runtime could not be loaded.');
  document.body.appendChild(s);
})();
