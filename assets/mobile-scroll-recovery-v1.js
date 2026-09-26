/* FinalForge Mobile Scroll Recovery v1 — keep vertical scrolling available unless a real overlay is open. */
(()=>{
  'use strict';

  const root=document.documentElement;
  let queued=false;

  function visible(el){
    if(!el||el.hidden||el.getAttribute('aria-hidden')==='true') return false;
    const style=getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden'&&Number.parseFloat(style.opacity||'1')>.01;
  }

  function state(){
    const body=document.body;
    if(!body||!root.classList.contains('ff-real-mobile')||body.classList.contains('auth-pending')){
      root.classList.remove('ff-scroll-free','ff-scroll-locked');
      return;
    }

    const palette=document.getElementById('ffV2Palette');
    const paletteOpen=visible(palette);
    if(body.classList.contains('ff-v2-palette-open')&&!paletteOpen) body.classList.remove('ff-v2-palette-open');

    const moreSheet=document.getElementById('mobileMoreSheet');
    const moreOpen=!!moreSheet&&(moreSheet.classList.contains('open')||moreSheet.getAttribute('aria-hidden')==='false');
    if(body.classList.contains('mobile-nav-more-open')&&!moreOpen) body.classList.remove('mobile-nav-more-open');

    const nativeDialog=[...document.querySelectorAll('dialog[open]')].some(visible);
    const locked=paletteOpen||moreOpen||nativeDialog;

    root.classList.toggle('ff-scroll-locked',locked);
    root.classList.toggle('ff-scroll-free',!locked);

    if(!locked){
      const fixedTop=body.style.position==='fixed'?Number.parseFloat(body.style.top||'0'):0;
      ['overflow','overflow-y','position','top','right','bottom','left','height','max-height','touch-action'].forEach(p=>body.style.removeProperty(p));
      ['overflow','overflow-y','height','max-height','touch-action'].forEach(p=>root.style.removeProperty(p));
      if(Number.isFinite(fixedTop)&&fixedTop<0&&window.scrollY===0) requestAnimationFrame(()=>scrollTo(0,-fixedTop));
    }
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;state()});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  addEventListener('finalforge-ready',()=>{schedule();setTimeout(schedule,120);setTimeout(schedule,600)});
  addEventListener('pageshow',schedule,{passive:true});
  addEventListener('focus',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(schedule,120),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  document.addEventListener('touchstart',schedule,{passive:true});
  document.addEventListener('touchend',schedule,{passive:true});
  document.addEventListener('pointerup',schedule,{passive:true});

  const observeTarget=document.body||document.documentElement;
  new MutationObserver(schedule).observe(observeTarget,{
    subtree:true,
    attributes:true,
    attributeFilter:['class','hidden','aria-hidden','style']
  });
})();
