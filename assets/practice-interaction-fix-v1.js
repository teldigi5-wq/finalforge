/* FinalForge Practice Interaction Fix v1 — single delegated control owner + overlap recovery. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PRACTICE_INTERACTION_FIX_V1)return;
  window.FINALFORGE_PRACTICE_INTERACTION_FIX_V1=Object.freeze({version:'1.0.0',mode:'delegated-hit-test'});

  const practice=document.getElementById('practice');
  if(!practice)return;

  const CONTROL_SELECTOR=[
    '[data-start-mode]','[data-go-tool]','[data-practice-module]',
    '[data-resume-exam]','[data-discard-exam]','[data-question-index]',
    '[data-exam-prev]','[data-exam-next]','[data-exam-finish]','[data-exam-submit]',
    '[data-exam-exit]','[data-exam-flag]','[data-results-close]','[data-results-retry]'
  ].join(',');

  const visibleControl=control=>{
    if(!control||!practice.contains(control))return false;
    if(control.matches(':disabled,[aria-disabled="true"]'))return false;
    const style=getComputedStyle(control);
    return style.display!=='none'&&style.visibility!=='hidden';
  };

  function normalizePracticeState(){
    if(!practice.classList.contains('active'))return;
    practice.removeAttribute('inert');
    practice.removeAttribute('hidden');
    practice.setAttribute('aria-hidden','false');
    practice.classList.add('ff-practice-interaction-safe');

    ['practiceWorkbench','practiceHero','practiceStats','practiceModuleTabs'].forEach(id=>{
      const node=document.getElementById(id);
      if(node)node.style.pointerEvents='auto';
    });
  }

  function directControl(target){
    const control=target?.closest?.(CONTROL_SELECTOR);
    return visibleControl(control)?control:null;
  }

  function controlUnderPointer(event){
    if(typeof document.elementsFromPoint!=='function')return null;
    const stack=document.elementsFromPoint(event.clientX,event.clientY);
    for(const node of stack){
      const control=node?.closest?.(CONTROL_SELECTOR);
      if(visibleControl(control))return control;
    }
    return null;
  }

  function currentQuestionIndex(){
    const current=practice.querySelector('[data-question-index][aria-current="step"], [data-question-index].current');
    const index=Number(current?.dataset?.questionIndex);
    return Number.isFinite(index)?index:0;
  }

  function route(control){
    if(control.dataset.startMode!==undefined){
      window.startPracticeExam?.(control.dataset.startMode,Number(control.dataset.variant)||1);
      return true;
    }
    if(control.dataset.goTool!==undefined){
      window.go?.(control.dataset.goTool);
      return true;
    }
    if(control.dataset.practiceModule!==undefined){
      window.setPracticeMod?.(control.dataset.practiceModule);
      return true;
    }
    if(control.hasAttribute('data-resume-exam')){window.resumePracticeExam?.();return true}
    if(control.hasAttribute('data-discard-exam')){window.discardPracticeExam?.();return true}
    if(control.dataset.questionIndex!==undefined){window.goPracticeQuestion?.(Number(control.dataset.questionIndex)||0);return true}
    if(control.hasAttribute('data-exam-prev')){window.goPracticeQuestion?.(Math.max(0,currentQuestionIndex()-1));return true}
    if(control.hasAttribute('data-exam-next')){window.goPracticeQuestion?.(currentQuestionIndex()+1);return true}
    if(control.hasAttribute('data-exam-finish')||control.hasAttribute('data-exam-submit')){window.submitPracticeExam?.();return true}
    if(control.hasAttribute('data-exam-exit')){window.exitPracticeExam?.();return true}
    if(control.hasAttribute('data-exam-flag')){window.togglePracticeFlag?.();return true}
    if(control.hasAttribute('data-results-close')){window.closePracticeResults?.();return true}
    if(control.hasAttribute('data-results-retry')){window.retryPracticeExam?.();return true}
    return false;
  }

  document.addEventListener('click',event=>{
    if(!practice.classList.contains('active'))return;
    normalizePracticeState();

    let control=directControl(event.target);
    if(!control&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY))control=controlUnderPointer(event);
    if(!control)return;

    /* Capture owns these controls so stale direct listeners/overlays cannot double-fire or swallow them. */
    event.preventDefault();
    event.stopImmediatePropagation();
    route(control);
  },true);

  addEventListener('finalforge-after-navigate',event=>{
    if(event?.detail?.id==='practice')requestAnimationFrame(normalizePracticeState);
  });
  addEventListener('finalforge-practice-v5-ready',()=>requestAnimationFrame(normalizePracticeState));

  new MutationObserver(()=>{
    if(practice.classList.contains('active'))requestAnimationFrame(normalizePracticeState);
  }).observe(practice,{attributes:true,attributeFilter:['class','inert','aria-hidden'],childList:true,subtree:false});

  normalizePracticeState();
})();
