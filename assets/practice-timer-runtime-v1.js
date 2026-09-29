/* FinalForge Practice Timer Runtime v1 — deadline-based countdown resilient to UI re-renders and browser throttling. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PRACTICE_TIMER_V1)return;
  window.FINALFORGE_PRACTICE_TIMER_V1=Object.freeze({version:'1.0.0',mode:'deadline-sync'});

  const ACTIVE_KEY='finalforge_exam_v4_active';
  let handle=0;
  let lastExamId='';
  let expiredExamId='';

  const readActive=()=>{
    try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch{return null}
  };
  const fmt=seconds=>{
    const safe=Math.max(0,Number.isFinite(seconds)?Math.floor(seconds):0);
    const h=Math.floor(safe/3600),m=Math.floor((safe%3600)/60),s=safe%60;
    return [h,m,s].map(value=>String(value).padStart(2,'0')).join(':');
  };
  const deadlineFor=state=>{
    const exact=Number(state?.endAt);
    if(Number.isFinite(exact)&&exact>0)return exact;
    const created=Number(state?.createdAt),duration=Number(state?.duration);
    return Number.isFinite(created)&&Number.isFinite(duration)&&duration>0?created+(duration*1000):NaN;
  };
  const nextDelay=remainingMs=>{
    if(!Number.isFinite(remainingMs)||remainingMs<=0)return 1000;
    const toBoundary=remainingMs%1000;
    return Math.max(180,Math.min(1000,toBoundary+35));
  };

  function ensureMeta(clock){
    const rail=clock.closest('.ff-v5-exam-rail,.exam-rail');
    if(!rail)return null;
    let meta=rail.querySelector('[data-ff-timer-meta]');
    if(!meta){
      meta=document.createElement('div');
      meta.className='ff-timer-meta';
      meta.dataset.ffTimerMeta='1';
      meta.setAttribute('aria-hidden','true');
      clock.insertAdjacentElement('afterend',meta);
    }
    return meta;
  }

  function paint(clock,state,deadline){
    const rail=clock.closest('.ff-v5-exam-rail,.exam-rail');
    const now=Date.now();
    const remainingMs=Math.max(0,deadline-now);
    const remainingSeconds=Math.ceil(remainingMs/1000);
    const next=fmt(remainingSeconds);
    if(clock.textContent!==next)clock.textContent=next;
    clock.dataset.timerLive='1';
    clock.setAttribute('aria-label',`${next} remaining`);

    if(rail){
      rail.classList.toggle('ff-timer-warning',remainingSeconds>300&&remainingSeconds<=900);
      rail.classList.toggle('ff-timer-urgent',remainingSeconds<=300);
      rail.classList.toggle('ff-timer-expired',remainingSeconds<=0);
    }

    const meta=ensureMeta(clock);
    if(meta){
      if(remainingSeconds<=0)meta.textContent='Time expired';
      else{
        const end=new Date(deadline);
        meta.textContent=`Ends ${end.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · live countdown`;
      }
    }

    if(remainingSeconds<=0&&state?.id&&expiredExamId!==state.id){
      expiredExamId=state.id;
      window.dispatchEvent(new CustomEvent('finalforge-exam-time-expired',{detail:{examId:state.id}}));
    }
    return remainingMs;
  }

  function tick(){
    clearTimeout(handle);handle=0;
    const clock=document.getElementById('examClock');
    const practice=document.getElementById('practice');
    if(!clock||!practice?.classList.contains('active')){
      handle=setTimeout(tick,700);
      return;
    }

    const state=readActive();
    const deadline=deadlineFor(state);
    if(!state||state.finished||!Number.isFinite(deadline)){
      clock.textContent='--:--:--';
      clock.removeAttribute('data-timer-live');
      const meta=ensureMeta(clock);if(meta)meta.textContent='Timer unavailable';
      handle=setTimeout(tick,1000);
      return;
    }

    if(lastExamId!==state.id){lastExamId=state.id;expiredExamId=''}
    const remainingMs=paint(clock,state,deadline);
    handle=setTimeout(tick,nextDelay(remainingMs));
  }

  function syncNow(){clearTimeout(handle);handle=setTimeout(tick,0)}

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});
  addEventListener('focus',syncNow,{passive:true});
  addEventListener('pageshow',syncNow,{passive:true});
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='practice')syncNow()});
  addEventListener('finalforge-practice-v5-ready',syncNow);

  const practice=document.getElementById('practice');
  if(practice)new MutationObserver(()=>syncNow()).observe(practice,{childList:true,subtree:true});
  syncNow();
})();