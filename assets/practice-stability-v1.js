/* FinalForge Practice Stability v2 — navigation hook, no router replacement. */
(()=>{
  'use strict';

  const practice=document.getElementById('practice');
  if(!practice)return;
  const $=s=>document.querySelector(s);
  let cleaning=false;

  const examRunning=()=>Boolean(practice.querySelector('.exam-app'));

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
      window.scrollTo({top:0,left:0,behavior:'auto'});
      normalizePracticeShell();
      return false;
    }
    if(id!=='practice'&&practiceActive)leavePracticeSafely();
    return true;
  };

  addEventListener('finalforge-after-navigate',event=>{
    if(event?.detail?.id==='practice')requestAnimationFrame(normalizePracticeShell);
    else document.body.classList.remove('ff-practice-exam-running');
  });

  const workbench=$('#practiceWorkbench');
  if(workbench)new MutationObserver(()=>requestAnimationFrame(normalizePracticeShell))
    .observe(workbench,{childList:true,subtree:false});

  normalizePracticeShell();
})();
