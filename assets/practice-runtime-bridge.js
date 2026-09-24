/* FinalForge practice runtime bridge — keeps inline practice actions callable after bundle reconstruction. */
(()=>{
  const expose=name=>{
    try{
      const value=(0,eval)(`typeof ${name}==='function'?${name}:undefined`);
      if(typeof value==='function') window[name]=value;
    }catch{}
  };

  [
    'renderPractice','renderPracticeStart','setPracticeMod','setPracticeModule',
    'startQuiz','submitQuiz','startMock','finishMock','renderMock','stopMock',
    'updateMockTimer','mockRules','renderReferral','renderReferralBuilder',
    'buildReferral','printReferral','clearReferral','renderPracticeGuide'
  ].forEach(expose);

  ['startPresetMock','startRandomMock','resumeActiveMock','discardActiveMock',
   'renderMockLibrary','renderWeakness','printCurrentMock','printMarkingGuide',
   'printPresetPaper','clearMockHistory','clearWeakness','saveActive']
    .forEach(expose);

  window.dispatchEvent(new CustomEvent('finalforge-practice-ready'));
})();
