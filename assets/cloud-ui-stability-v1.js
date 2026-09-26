/* FinalForge Cloud UI Stability v2 — prevent delayed cloud hydration from rebuilding active mobile UI mid-gesture without suppressing first renders. */
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

      /* Never suppress the first real render of a section. The Practice shell starts
         empty in index.html and is populated only when renderPractice() runs. */
      if(!isPopulated()){
        if(!canRun())return;
        lastSignature=sig;
        return original.apply(this,args);
      }

      /* Once a section is already populated, identical cloud data must not rebuild it. */
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

  /* Extra recovery for the exact empty-Practice regression: if navigation reaches
     Practice with an uninitialized shell, render it immediately. */
  addEventListener('finalforge-mobile-navigate',event=>{
    const id=event?.detail?.id||event?.detail||document.querySelector('.section.active')?.id;
    if(id==='practice'&&!practicePopulated()&&typeof window.renderPractice==='function')window.renderPractice();
  });

  /* A stale cloud refresh must never recreate an overlay/lock state on Home. */
  addEventListener('finalforge-ready',()=>{
    if(!realMobile())return;
    if(!document.querySelector('dialog[open]')&&!document.querySelector('#mobileMoreSheet.open')&&!document.querySelector('#ffV2Palette:not([hidden])')){
      root.classList.remove('ff-scroll-locked');
      body.classList.remove('mobile-nav-more-open','ff-v2-palette-open');
    }
  },{once:true});
})();

/* Reference-inspired FinalForge workspace.
   Load after the canonical app and recovery layers so this stays an isolated, reversible redesign. */
(()=>{
  'use strict';
  let loaded=false;
  const load=()=>{
    if(loaded)return;loaded=true;
    if(!document.querySelector('link[data-finalforge-next-ui]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='assets/next-ui-v1.css?v=1';
      link.dataset.finalforgeNextUi='1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-finalforge-next-ui]')){
      const script=document.createElement('script');
      script.src='assets/next-ui-v1.js?v=1';
      script.async=false;
      script.dataset.finalforgeNextUi='1';
      script.onerror=()=>console.warn('[FinalForge] Next UI could not be loaded.');
      document.body.appendChild(script);
    }
  };
  addEventListener('finalforge-ready',()=>setTimeout(load,260),{once:true});
  if(document.readyState==='complete')setTimeout(load,900);
})();
