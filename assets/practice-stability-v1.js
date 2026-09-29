/* FinalForge Practice Stability v3 — navigation guard + Exam Studio v5 bootstrap. */
(()=>{
  'use strict';

  const practice=document.getElementById('practice');
  if(!practice)return;
  const $=s=>document.querySelector(s);
  let cleaning=false;

  const examRunning=()=>Boolean(practice.querySelector('.exam-app'));

  function loadStyleOnce(href){
    if([...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>link.href.includes(href)))return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const link=document.createElement('link');
      link.rel='stylesheet';link.href=`${href}?v=exam-studio-v5-1`;link.onload=resolve;link.onerror=()=>reject(new Error(`Could not load ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScriptOnce(src){
    if([...document.scripts].some(script=>script.src&&script.src.includes(src)))return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=`${src}?v=exam-studio-v5-1`;script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error(`Could not load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function bootstrapExamStudioV5(){
    try{
      await loadStyleOnce('assets/practice-premium-v5.css');
      await loadScriptOnce('assets/ip-final-blueprint-v5.js');
      await loadScriptOnce('assets/practice-exam-v5.js');
      window.dispatchEvent(new CustomEvent('finalforge-practice-v5-ready'));
      if(practice.classList.contains('active'))window.renderPractice?.();
    }catch(error){
      console.warn('[FinalForge] Exam Studio v5 enhancement could not load; using certified fallback.',error);
    }
  }

  function normalizePracticeShell(){
    const running=examRunning();
    document.body.classList.toggle('ff-practice-exam-running',running);
    if(!running){
      ['practiceHero','practiceStats','practiceModuleTabs','mockLibrary'].forEach(id=>{
        const el=document.getElementById(id);
        if(el)el.hidden=false;
      });
    }
  }

  function leavePracticeSafely(){
    if(cleaning)return;
    cleaning=true;
    try{
      if(examRunning()&&typeof window.exitPracticeExam==='function')window.exitPracticeExam();
      else if(practice.querySelector('.exam-results')&&typeof window.closePracticeResults==='function')window.closePracticeResults();
      normalizePracticeShell();
      document.body.classList.remove('ff-practice-exam-running');
    }catch(error){
      console.warn('[FinalForge] Practice cleanup fallback used.',error);
      document.body.classList.remove('ff-practice-exam-running');
      ['practiceHero','practiceStats','practiceModuleTabs','mockLibrary'].forEach(id=>{
        const el=document.getElementById(id);
        if(el)el.hidden=false;
      });
    }finally{cleaning=false}
  }

  const previousBeforeNavigate=window.finalforgeBeforeNavigate;
  window.finalforgeBeforeNavigate=function(target){
    if(typeof previousBeforeNavigate==='function'&&previousBeforeNavigate(target)===false)return false;
    const id=String(target||'');
    const practiceActive=practice.classList.contains('active');

    if(id==='practice'&&practiceActive&&examRunning()){
      normalizePracticeShell();
      return false;
    }
    if(id!=='practice'&&practiceActive)leavePracticeSafely();
    return true;
  };

  addEventListener('finalforge-after-navigate',event=>{
    if(event?.detail?.id==='practice')requestAnimationFrame(()=>{
      normalizePracticeShell();
      if(window.FINALFORGE_PRACTICE_V5&&!examRunning())window.renderPractice?.();
    });
    else document.body.classList.remove('ff-practice-exam-running');
  });

  const workbench=$('#practiceWorkbench');
  if(workbench)new MutationObserver(()=>requestAnimationFrame(normalizePracticeShell))
    .observe(workbench,{childList:true,subtree:false});

  normalizePracticeShell();
  bootstrapExamStudioV5();
})();