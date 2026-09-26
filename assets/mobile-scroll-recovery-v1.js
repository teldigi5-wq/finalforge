/* FinalForge Mobile Scroll Recovery v3 — one Android document scroller + feature-safe positioning. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const observed=new WeakSet();
  let queued=false;
  let wasLocked=false;

  const realMobile=()=>root.classList.contains('ff-real-mobile');

  /* Feature runtimes historically request smooth programmatic scrolling while they
     replace large DOM regions. Android can keep that animation alive while the user
     starts another gesture. Preserve the API, but make those requests instant on
     real phones. Desktop behavior is unchanged. */
  if(!window.__ffMobileScrollMethodsNormalized){
    window.__ffMobileScrollMethodsNormalized=true;
    const nativeScrollTo=window.scrollTo;
    window.scrollTo=function(first,second){
      if(realMobile()&&first&&typeof first==='object'&&first.behavior==='smooth'){
        first={...first,behavior:'auto'};
      }
      return nativeScrollTo.call(window,first,second);
    };
    const nativeScrollBy=window.scrollBy;
    window.scrollBy=function(first,second){
      if(realMobile()&&first&&typeof first==='object'&&first.behavior==='smooth'){
        first={...first,behavior:'auto'};
      }
      return nativeScrollBy.call(window,first,second);
    };
    const nativeInto=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(options){
      if(realMobile()&&options&&typeof options==='object'&&options.behavior==='smooth'){
        options={...options,behavior:'auto'};
      }
      return nativeInto.call(this,options);
    };
  }

  const overlayOpen=(el)=>{
    if(!el||el.hidden)return false;
    if(el.getAttribute('aria-hidden')==='true')return false;
    return el.classList.contains('open')||el.getAttribute('aria-hidden')==='false';
  };

  const visibleDialogOpen=()=>[...document.querySelectorAll('dialog[open]')].some(dialog=>{
    if(dialog.hidden||dialog.closest('.section:not(.active)'))return false;
    const style=getComputedStyle(dialog);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.pointerEvents!=='none';
  });

  function bindOverlay(el){
    if(!el||observed.has(el))return;
    observed.add(el);
    new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class','hidden','aria-hidden']});
  }

  function state(){
    const body=document.body;
    if(!body||!realMobile()||body.classList.contains('auth-pending')){
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

    const nativeDialog=visibleDialogOpen();
    const locked=paletteOpen||moreOpen||nativeDialog;

    root.classList.toggle('ff-scroll-locked',locked);
    root.classList.toggle('ff-scroll-free',!locked);

    /* Only repair stale inline locks when transitioning from a real overlay lock
       back to the document. Ordinary feature clicks and touch scrolling do not
       rewrite layout styles. */
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
  addEventListener('finalforge-feature-state',schedule);
  addEventListener('pageshow',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(schedule,100),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});

  /* Only body lock classes can change scroll ownership. No subtree/style observer. */
  if(document.body){
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
})();
