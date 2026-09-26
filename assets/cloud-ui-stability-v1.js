/* FinalForge Cloud UI Stability v1 — prevent delayed cloud hydration from rebuilding active mobile UI mid-gesture. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const body=document.body;
  if(!body)return;

  const realMobile=()=>root.classList.contains('ff-real-mobile')||matchMedia('(max-width:900px)').matches||((navigator.maxTouchPoints||0)>0&&matchMedia('(pointer:coarse)').matches);
  let lastInteractionAt=0;
  let pendingTimer=0;

  ['touchstart','touchmove','pointerdown','wheel'].forEach(type=>{
    addEventListener(type,()=>{lastInteractionAt=Date.now()},{passive:true});
  });

  const idleFor=()=>Date.now()-lastInteractionAt;
  const progressSignature=()=>localStorage.getItem('finalforge_progress')||'{}';
  const practiceSignature=()=>[
    localStorage.getItem('finalforge_exam_v4_active')||'',
    localStorage.getItem('finalforge_exam_v4_history')||'',
    localStorage.getItem('finalforge_quiz_scores')||''
  ].join('\u001f');

  const wrapStable=(name,signatureFn,canRun=()=>true)=>{
    const original=window[name];
    if(typeof original!=='function'||original.__ffCloudStable)return;

    let lastSignature=signatureFn();
    let queuedArgs=null;

    const runQueued=()=>{
      pendingTimer=0;
      if(!queuedArgs)return;
      if(realMobile()&&(idleFor()<700||root.classList.contains('ff-scroll-locked'))){
        pendingTimer=setTimeout(runQueued,Math.max(180,760-idleFor()));
        return;
      }
      const args=queuedArgs;queuedArgs=null;
      if(!canRun())return;
      const beforeSection=document.querySelector('.section.active')?.id||'';
      const beforeY=window.scrollY;
      const sig=signatureFn();
      lastSignature=sig;
      original.apply(window,args);
      if(realMobile()&&document.querySelector('.section.active')?.id===beforeSection){
        requestAnimationFrame(()=>window.scrollTo({top:beforeY,left:0,behavior:'instant'}));
      }
    };

    function stableWrapper(...args){
      const sig=signatureFn();
      const authOpen=!body.classList.contains('auth-pending');

      /* Initial page render already happened before this guard loads. If cloud sync
         returns identical data, do not rebuild the live DOM at all. */
      if(authOpen&&sig===lastSignature)return;

      if(!realMobile()){
        if(!canRun())return;
        lastSignature=sig;
        return original.apply(this,args);
      }

      queuedArgs=args;
      clearTimeout(pendingTimer);
      pendingTimer=setTimeout(runQueued,idleFor()<700?760-idleFor():0);
    }

    stableWrapper.__ffCloudStable=true;
    stableWrapper.__ffOriginal=original;
    window[name]=stableWrapper;
  };

  wrapStable('renderHome',progressSignature);
  wrapStable('renderModules',progressSignature);
  wrapStable('renderPlanner',progressSignature);
  wrapStable('renderPractice',practiceSignature,()=>!document.querySelector('#practice .exam-app'));

  /* A stale cloud refresh must never recreate an overlay/lock state on Home. */
  addEventListener('finalforge-ready',()=>{
    if(!realMobile())return;
    if(!document.querySelector('dialog[open]')&&!document.querySelector('#mobileMoreSheet.open')&&!document.querySelector('#ffV2Palette:not([hidden])')){
      root.classList.remove('ff-scroll-locked');
      body.classList.remove('mobile-nav-more-open','ff-v2-palette-open');
    }
  },{once:true});
})();