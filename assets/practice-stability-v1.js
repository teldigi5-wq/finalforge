/* FinalForge Practice Stability v1 — prevent exam state from trapping navigation. */
(() => {
  'use strict';

  const practice = document.getElementById('practice');
  if (!practice || typeof window.go !== 'function') return;

  const $ = s => document.querySelector(s);
  const originalGo = window.go.bind(window);
  let cleaning = false;

  function examRunning(){
    return Boolean(practice.querySelector('.exam-app'));
  }

  function normalizePracticeShell(){
    const running = examRunning();
    document.body.classList.toggle('ff-practice-exam-running', running);

    if (!running) {
      ['practiceHero','practiceStats','practiceModuleTabs','mockLibrary'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
      });
    }
  }

  function leavePracticeSafely(){
    if (cleaning) return;
    cleaning = true;
    try {
      if (examRunning() && typeof window.exitPracticeExam === 'function') {
        /* Canonical exit saves the attempt, stops its timer and restores the Practice shell. */
        window.exitPracticeExam();
      } else if (practice.querySelector('.exam-results') && typeof window.closePracticeResults === 'function') {
        window.closePracticeResults();
      }
      normalizePracticeShell();
      document.body.classList.remove('ff-practice-exam-running');
    } catch (error) {
      console.warn('[FinalForge] Practice cleanup fallback used.', error);
      document.body.classList.remove('ff-practice-exam-running');
      ['practiceHero','practiceStats','practiceModuleTabs','mockLibrary'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
      });
    } finally {
      cleaning = false;
    }
  }

  window.go = function(id){
    const target = String(id || '');
    const practiceActive = practice.classList.contains('active');

    /* Clicking Practice while already answering a paper should not destroy/re-render it. */
    if (target === 'practice' && practiceActive && examRunning()) {
      window.scrollTo({top:0,behavior:'smooth'});
      normalizePracticeShell();
      return;
    }

    /* Leaving an active exam must save + stop its timer before another section opens. */
    if (target !== 'practice' && practiceActive) leavePracticeSafely();

    const result = originalGo(target);
    if (target === 'practice') requestAnimationFrame(normalizePracticeShell);
    else document.body.classList.remove('ff-practice-exam-running');
    return result;
  };

  /* Keep body state synced when the runner swaps Practice Center <-> Exam <-> Results. */
  const workbench = $('#practiceWorkbench');
  if (workbench) {
    new MutationObserver(() => requestAnimationFrame(normalizePracticeShell))
      .observe(workbench,{childList:true,subtree:false});
  }

  /* Recover from an interrupted older session that left Practice controls hidden. */
  normalizePracticeShell();
})();
