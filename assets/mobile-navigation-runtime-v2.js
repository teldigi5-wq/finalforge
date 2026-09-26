/* FinalForge Mobile Navigation Runtime v4 — atomic section switching only on genuine compact screens. */
(()=>{
  'use strict';

  const html=document.documentElement;
  const body=document.body;
  const originalGo=typeof window.go==='function'?window.go.bind(window):null;
  let switching=false;
  let queuedTarget='';

  const compactScreen=()=>{
    const viewport=Number(window.innerWidth||document.documentElement.clientWidth||9999);
    if(viewport<=900||matchMedia('(max-width:900px)').matches)return true;
    const sw=Number(screen?.width||0),sh=Number(screen?.height||0);
    const physicalShort=Math.min(sw||9999,sh||9999);
    const handheldTouch=(navigator.maxTouchPoints||0)>0&&matchMedia('(hover:none) and (pointer:coarse)').matches;
    return handheldTouch&&physicalShort<=640;
  };
  const isMobile=()=>compactScreen();
  const section=id=>document.getElementById(String(id||''));
  const examRunning=()=>!!document.querySelector('#practice .exam-app');
  const examResults=()=>!!document.querySelector('#practice .exam-results');

  function scrollTopNow(){
    try{window.scrollTo(0,0)}catch{}
    html.scrollTop=0;
    if(body) body.scrollTop=0;
  }

  function cleanupPracticeBeforeLeave(target){
    const practice=document.getElementById('practice');
    if(!practice?.classList.contains('active')||target==='practice') return;
    try{
      if(examRunning()&&typeof window.exitPracticeExam==='function') window.exitPracticeExam();
      else if(examResults()&&typeof window.closePracticeResults==='function') window.closePracticeResults();
    }catch(err){console.warn('[FinalForge mobile navigation] Practice cleanup fallback.',err)}
    body?.classList.remove('ff-practice-exam-running');
  }

  function renderTarget(id){
    try{
      if(id==='resources'&&typeof window.renderResources==='function') window.renderResources();
      if(id==='practice'&&typeof window.renderPractice==='function') window.renderPractice();
      if(id==='schedule'&&typeof window.renderSchedule==='function') window.renderSchedule();
      if(id==='planner'&&typeof window.renderPlanner==='function') window.renderPlanner();
    }catch(err){console.warn('[FinalForge mobile navigation] Target render fallback.',err)}
  }

  function activate(id){
    const target=section(id);
    if(!target?.classList.contains('section')) return false;

    if(id==='practice'&&target.classList.contains('active')&&examRunning()){
      scrollTopNow();
      return true;
    }

    cleanupPracticeBeforeLeave(id);
    window.closeMobileNavMore?.();

    document.querySelectorAll('.section').forEach(el=>{
      el.classList.remove('active','section-leaving');
      el.setAttribute('aria-hidden','true');
    });
    target.classList.add('active');
    target.setAttribute('aria-hidden','false');

    document.querySelectorAll('[data-go]').forEach(btn=>btn.classList.toggle('active',btn.dataset.go===id));

    renderTarget(id);
    target.querySelectorAll('.ff-enter').forEach(el=>el.classList.add('ff-entered'));

    body?.classList.remove('mobile-nav-more-open');
    scrollTopNow();
    requestAnimationFrame(()=>{
      scrollTopNow();
      window.dispatchEvent(new CustomEvent('finalforge-mobile-navigate',{detail:{id}}));
      try{window.finalforgeAfterNavigate?.(id)}catch(err){console.warn('[FinalForge mobile navigation] afterNavigate fallback.',err)}
    });
    return true;
  }

  window.go=function(id){
    const target=String(id||'');
    if(!isMobile()||!section(target)?.classList.contains('section')) return originalGo?.(target);

    if(switching){queuedTarget=target;return;}
    switching=true;
    activate(target);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      switching=false;
      if(queuedTarget&&queuedTarget!==target){const next=queuedTarget;queuedTarget='';window.go(next)}
      else queuedTarget='';
    }));
  };

  addEventListener('finalforge-ready',()=>{
    if(!isMobile())return;
    document.querySelectorAll('.section').forEach(el=>el.classList.remove('section-leaving'));
    const active=document.querySelector('.section.active');
    if(active){
      document.querySelectorAll('.section').forEach(el=>el.setAttribute('aria-hidden',String(el!==active)));
      scrollTopNow();
    }
  },{once:true});
})();
