/* Study activity and roadmap. Visual motion is owned by the current UI scripts only. */
(() => {
  const activityKey='finalforge_activity_v3';

  window.logStudyActivity = function(type='visit'){
    const today=new Date().toISOString().slice(0,10); let a={};
    try{a=JSON.parse(localStorage.getItem(activityKey)||'{}')}catch{}
    a[today] ??= {count:0,types:{}}; a[today].count++; a[today].types[type]=(a[today].types[type]||0)+1;
    localStorage.setItem(activityKey,JSON.stringify(a));
  };

  function streak(){
    let a={};try{a=JSON.parse(localStorage.getItem(activityKey)||'{}')}catch{}
    let n=0,d=new Date();
    for(;;){const k=d.toISOString().slice(0,10);if(a[k]){n++;d.setDate(d.getDate()-1)}else break}
    return n;
  }

  const roadmapSteps=[
    {v:'V1',title:'Foundation',status:'Complete',cls:'complete',text:'Responsive multi-module hub, official schedule, uploaded resources, syllabus tracking and urgency-first planner.'},
    {v:'V2',title:'Practice Edition',status:'Complete',cls:'complete',text:'Quick quizzes, answer explanations, timed mock generator, referral-sheet builder and readiness score.'},
    {v:'V3',title:'Experience Edition',status:'Complete',cls:'complete',text:'UI/UX redesign, transitions, 3D depth, Mock Paper Studio, print/PDF papers, autosave, attempt history and weak-area insights.'},
    {v:'V4',title:'Secure Access + Launch',status:'Current build',cls:'current',text:'Student mobile OTP signup, Student-ID login, admin role, cloud progress sync, private roster seeding, security headers and deployment hardening.'},
    {v:'V5',title:'Community + Smart Study',status:'Next',cls:'',text:'Announcements, bookmarks, shared study sets, richer cohort analytics and adaptive practice after the urgent exam launch is stable.'}
  ];

  function renderRoadmap(){
    const el=document.querySelector('#buildTimeline');if(!el)return;
    el.innerHTML=roadmapSteps.map(x=>`<article class="card build-step ${x.cls}"><div class="step-num">${x.v}</div><div><h3>${x.title}</h3><p class="muted" style="margin:4px 0 0">${x.text}</p></div><span class="pill status">${x.status}</span></article>`).join('');
    refreshEffects();
  }

  // No body-wide observer, cursor handler, or duplicate card-tilt listeners.
  function refreshEffects(){}
  window.finalforgeAfterNavigate=function(id){
    if(id==='roadmap')renderRoadmap();
    logStudyActivity('nav-'+id);
  };

  renderRoadmap(); refreshEffects(); logStudyActivity('visit');
  const st=streak(); if(st>1) setTimeout(()=>toast(`🔥 ${st}-day FinalForge study streak`),700);
})();
