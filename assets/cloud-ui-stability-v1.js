/* FinalForge Cloud UI Stability v3 — delay mobile cloud hydration without classifying touch desktops as phones. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const body=document.body;
  if(!body)return;

  const compactScreen=()=>{
    const sw=Number(screen?.width||0),sh=Number(screen?.height||0);
    const physicalShort=Math.min(sw||9999,sh||9999);
    const viewport=Number(window.innerWidth||document.documentElement.clientWidth||9999);
    return physicalShort<=900||viewport<=900||matchMedia('(max-width:900px)').matches;
  };
  const realMobile=()=>root.classList.contains('ff-real-mobile')||compactScreen();
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

  const hasChildren=id=>Boolean(document.querySelector(id)?.children?.length);
  const homePopulated=()=>hasChildren('#homeModules');
  const modulesPopulated=()=>hasChildren('#moduleGrid');
  const plannerPopulated=()=>hasChildren('#plannerTasks');
  const practicePopulated=()=>hasChildren('#practiceModuleTabs')&&hasChildren('#practiceHero')&&hasChildren('#practiceWorkbench');

  const wrapStable=(name,signatureFn,canRun=()=>true,isPopulated=()=>true)=>{
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

      if(!isPopulated()){
        if(!canRun())return;
        lastSignature=sig;
        return original.apply(this,args);
      }

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

  wrapStable('renderHome',progressSignature,()=>true,homePopulated);
  wrapStable('renderModules',progressSignature,()=>true,modulesPopulated);
  wrapStable('renderPlanner',progressSignature,()=>true,plannerPopulated);
  wrapStable('renderPractice',practiceSignature,()=>!document.querySelector('#practice .exam-app'),practicePopulated);

  addEventListener('finalforge-mobile-navigate',event=>{
    if(!realMobile())return;
    const id=event?.detail?.id||event?.detail||document.querySelector('.section.active')?.id;
    if(id==='practice'&&!practicePopulated()&&typeof window.renderPractice==='function')window.renderPractice();
  });

  addEventListener('finalforge-ready',()=>{
    if(!realMobile())return;
    if(!document.querySelector('dialog[open]')&&!document.querySelector('#mobileMoreSheet.open')&&!document.querySelector('#ffV2Palette:not([hidden])')){
      root.classList.remove('ff-scroll-locked');
      body.classList.remove('mobile-nav-more-open','ff-v2-palette-open');
    }
  },{once:true});
})();
