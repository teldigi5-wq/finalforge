/* FinalForge Cloud UI Stability v6 — coalesced post-login hydration without long main-thread render bursts. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const body=document.body;
  if(!body)return;

  const realMobile=()=>typeof window.finalforgeIsMobile==='function'
    ?window.finalforgeIsMobile()
    :root.classList.contains('ff-real-mobile');

  let lastInteractionAt=0;
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

  const queue=new Map();
  let scheduled=false;
  let timer=0;

  const dispatchComplete=()=>{
    root.classList.remove('ff-cloud-rendering');
    try{window.dispatchEvent(new CustomEvent('finalforge-cloud-render-complete'))}catch{}
  };

  const scheduleStep=(delay=0)=>{
    if(scheduled)return;
    scheduled=true;
    const start=()=>requestAnimationFrame(flushOne);
    if(delay>0)timer=setTimeout(start,delay);else start();
  };

  function flushOne(){
    scheduled=false;
    timer=0;
    if(!queue.size){dispatchComplete();return;}

    if(realMobile()&&(idleFor()<700||root.classList.contains('ff-scroll-locked'))){
      scheduleStep(Math.max(180,760-idleFor()));
      return;
    }

    const [name,job]=queue.entries().next().value;
    queue.delete(name);
    root.classList.add('ff-cloud-rendering');

    const beforeSection=document.querySelector('.section.active')?.id||'';
    const beforeY=window.scrollY;
    try{job.original.apply(window,job.args)}catch(error){console.warn(`[FinalForge] deferred ${name} render failed`,error)}

    if(realMobile()&&document.querySelector('.section.active')?.id===beforeSection){
      requestAnimationFrame(()=>window.scrollTo({top:beforeY,left:0,behavior:'auto'}));
    }

    if(queue.size)scheduleStep();else dispatchComplete();
  }

  function enqueue(name,original,args){
    queue.set(name,{original,args});
    scheduleStep();
  }

  const wrapStable=(name,signatureFn,canRun=()=>true,isPopulated=()=>true)=>{
    const original=window[name];
    if(typeof original!=='function'||original.__ffCloudStable)return;

    let lastSignature=signatureFn();

    function stableWrapper(...args){
      const sig=signatureFn();
      const appOpen=!body.classList.contains('auth-pending');

      if(!isPopulated()){
        if(!canRun())return;
        lastSignature=sig;
        return original.apply(this,args);
      }

      if(sig===lastSignature)return;
      lastSignature=sig;
      if(!canRun())return;

      /* Practice UI is independent from syllabus-progress hydration. Never rebuild the
         hidden practice workspace just because finalforge_progress changed. */
      if(name==='renderPractice'&&!document.querySelector('#practice')?.classList.contains('active'))return;

      if(!appOpen)return;
      enqueue(name,original,args);
    }

    stableWrapper.__ffCloudStable=true;
    stableWrapper.__ffOriginal=original;
    window[name]=stableWrapper;
  };

  wrapStable('renderHome',progressSignature,()=>true,homePopulated);
  wrapStable('renderModules',progressSignature,()=>true,modulesPopulated);
  wrapStable('renderPlanner',progressSignature,()=>true,plannerPopulated);
  wrapStable('renderPractice',practiceSignature,()=>!document.querySelector('#practice .exam-app'),practicePopulated);

  addEventListener('finalforge-after-navigate',event=>{
    const id=event?.detail?.id||document.querySelector('.section.active')?.id;
    if(id==='practice'&&!practicePopulated()&&typeof window.renderPractice==='function')window.renderPractice();
  });

  addEventListener('finalforge-ready',()=>{
    if(realMobile()&&!document.querySelector('dialog[open]')&&!document.querySelector('#mobileMoreSheet.open')&&!document.querySelector('#ffV2Palette:not([hidden])')){
      root.classList.remove('ff-scroll-locked');
      body.classList.remove('mobile-nav-more-open','ff-v2-palette-open');
    }
  },{once:true});
})();
