/* FinalForge Mobile Scroll Recovery v2 — one Android document scroller, no per-swipe repair work. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const observed=new WeakSet();
  let queued=false;
  let wasLocked=false;

  const overlayOpen=(el)=>{
    if(!el||el.hidden)return false;
    if(el.getAttribute('aria-hidden')==='true')return false;
    return el.classList.contains('open')||el.getAttribute('aria-hidden')==='false';
  };

  function bindOverlay(el){
    if(!el||observed.has(el))return;
    observed.add(el);
    new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class','hidden','aria-hidden']});
  }

  function state(){
    const body=document.body;
    if(!body||!root.classList.contains('ff-real-mobile')||body.classList.contains('auth-pending')){
      root.classList.remove('ff-scroll-free','ff-scroll-locked');
      wasLocked=false;
      return;
    }

    const palette=document.getElementById('ffV2Palette');
    const paletteOpen=!!palette&&!palette.hidden&&body.classList.contains('ff-v2-palette-open');
    if(body.classList.contains('ff-v2-palette-open')&&!paletteOpen)body.classList.remove('ff-v2-palette-open');

    const moreSheet=document.getElementById('mobileMoreSheet');
    const moreOpen=overlayOpen(moreSheet)&&body.classList.contains('mobile-nav-more-open');
    if(body.classList.contains('mobile-nav-more-open')&&!moreOpen)body.classList.remove('mobile-nav-more-open');

    const nativeDialog=!!document.querySelector('dialog[open]');
    const locked=paletteOpen||moreOpen||nativeDialog;

    root.classList.toggle('ff-scroll-locked',locked);
    root.classList.toggle('ff-scroll-free',!locked);

    /* Only repair stale inline body locks when transitioning from locked -> free.
       Never rewrite overflow/position styles during ordinary touch scrolling. */
    if(wasLocked&&!locked){
      const fixedTop=body.style.position==='fixed'?Number.parseFloat(body.style.top||'0'):0;
      ['overflow','overflow-y','position','top','right','bottom','left','height','max-height','touch-action'].forEach(p=>body.style.removeProperty(p));
      ['overflow','overflow-y','height','max-height','touch-action'].forEach(p=>root.style.removeProperty(p));
      if(Number.isFinite(fixedTop)&&fixedTop<0&&window.scrollY===0)requestAnimationFrame(()=>window.scrollTo(0,-fixedTop));
    }
    wasLocked=locked;

    bindOverlay(palette);
    bindOverlay(moreSheet);
    bindOverlay(document.getElementById('mobileNavScrim'));
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;state()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  addEventListener('finalforge-ready',()=>{schedule();setTimeout(schedule,120)});
  addEventListener('finalforge-mobile-navigate',schedule);
  addEventListener('pageshow',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(schedule,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});

  /* Only body lock classes can change scroll ownership. No subtree/style observer. */
  if(document.body){
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
})();
