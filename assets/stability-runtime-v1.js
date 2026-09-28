/* FinalForge Stability Runtime v1 — coalesces functional renders and removes decorative work from navigation. */
(()=>{
  'use strict';
  if(window.FINALFORGE_STABILITY_RUNTIME_V1)return;
  window.FINALFORGE_STABILITY_RUNTIME_V1=Object.freeze({version:'1.0.0'});
  const html=document.documentElement;
  const body=document.body;
  html.classList.add('ff-stability-mode');

  const jobs=new Map();
  let scheduled=false;

  const activeSection=()=>document.querySelector('.section.active')?.id||'home';
  const sectionFor={
    renderHome:'home',
    renderModules:'modules',
    renderResources:'resources',
    renderPractice:'practice',
    renderSchedule:'schedule',
    renderPlanner:'planner'
  };

  function flushOne(){
    scheduled=false;
    if(!jobs.size)return;
    const [name,job]=jobs.entries().next().value;
    jobs.delete(name);
    if(sectionFor[name]&&sectionFor[name]!==activeSection()){
      if(jobs.size)schedule();
      return;
    }
    try{job.original.apply(window,job.args)}catch(error){console.warn(`[FinalForge stability] ${name} failed`,error)}
    if(jobs.size)schedule();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(flushOne);
  }

  function wrap(name){
    const original=window[name];
    if(typeof original!=='function'||original.__ffStabilityWrapped)return;
    function stableRenderer(...args){
      jobs.set(name,{original,args});
      schedule();
    }
    stableRenderer.__ffStabilityWrapped=true;
    stableRenderer.__ffOriginal=original;
    window[name]=stableRenderer;
  }

  ['renderHome','renderModules','renderResources','renderPractice','renderSchedule','renderPlanner'].forEach(wrap);

  const navRender={home:'renderHome',modules:'renderModules',resources:'renderResources',practice:'renderPractice',schedule:'renderSchedule',planner:'renderPlanner'};
  addEventListener('finalforge-after-navigate',event=>{
    const id=String(event?.detail?.id||activeSection());
    const name=navRender[id];
    if(name&&typeof window[name]==='function')window[name]();
  });

  /* Optional visual runtimes call this hook. In stability mode it is intentionally a no-op. */
  window.finalforgeRefreshEffects=()=>{};

  /* Recover any stale overlay/scroll locks left by older cached runtimes. */
  function recoverLocks(){
    html.classList.remove('ff-scroll-locked','ff-cloud-rendering');
    body?.classList.remove('mobile-nav-more-open','ff-v2-palette-open');
  }
  addEventListener('pageshow',recoverLocks,{passive:true});
  addEventListener('focus',recoverLocks,{passive:true});
  recoverLocks();
})();