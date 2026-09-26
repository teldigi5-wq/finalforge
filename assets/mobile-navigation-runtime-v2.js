/* FinalForge Mobile Navigation Runtime v5 — normalize mobile state without replacing go(). */
(()=>{
  'use strict';

  const html=document.documentElement;
  const body=document.body;
  const isMobile=()=>typeof window.finalforgeIsMobile==='function'
    ?window.finalforgeIsMobile()
    :html.classList.contains('ff-real-mobile');

  function scrollTopNow(){
    try{window.scrollTo(0,0)}catch{}
    html.scrollTop=0;
    if(body)body.scrollTop=0;
  }

  function normalize(id){
    if(!isMobile())return;
    const active=document.getElementById(String(id||''))||document.querySelector('.section.active');
    if(!active?.classList.contains('section'))return;

    document.querySelectorAll('.section').forEach(el=>{
      const selected=el===active;
      el.classList.toggle('active',selected);
      el.classList.remove('section-leaving');
      el.setAttribute('aria-hidden',String(!selected));
    });
    document.querySelectorAll('[data-go]').forEach(btn=>btn.classList.toggle('active',btn.dataset.go===active.id));
    active.querySelectorAll('.ff-enter').forEach(el=>el.classList.add('ff-entered'));
    body?.classList.remove('mobile-nav-more-open');
    window.closeMobileNavMore?.();
    scrollTopNow();
  }

  addEventListener('finalforge-after-navigate',event=>normalize(event?.detail?.id));
  addEventListener('finalforge-ready',()=>{
    if(!isMobile())return;
    normalize(document.querySelector('.section.active')?.id||'home');
  },{once:true});
})();
