/* FinalForge Next UI v1 — academic selector, analytics workspace, reference-inspired app chrome. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const D=window.FINALFORGE_DATA||window.EXAMHUB_DATA||{};
  const modules=D.modules||{};
  const resources=D.resources||[];
  let installed=false;

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const progress=()=>readJSON('finalforge_progress',{});
  const scores=()=>readJSON('finalforge_quiz_scores',{});
  const history=()=>readJSON('finalforge_exam_v4_history',[]);
  const modulePct=(key)=>{
    const mod=modules[key];
    if(!mod?.lessons?.length)return 0;
    const p=progress()[key]||{};
    return Math.round(mod.lessons.filter((_,i)=>p[i]).length/mod.lessons.length*100);
  };
  const overallPct=()=>{
    let done=0,total=0;const p=progress();
    Object.entries(modules).forEach(([key,mod])=>{
      total+=mod.lessons?.length||0;
      done+=(mod.lessons||[]).filter((_,i)=>p[key]?.[i]).length;
    });
    return total?Math.round(done/total*100):0;
  };
  const bestScore=()=>{
    const vals=Object.values(scores()).map(x=>Number(x?.best||0)).filter(Number.isFinite);
    return vals.length?Math.max(...vals):0;
  };
  const completedAttempts=()=>history().length;

  function academicSwitcher(){
    const home=$('#home');
    const hero=$('#home .hero-v3');
    if(!home||!hero||$('.ff-academic-switcher',home))return;
    const wrap=document.createElement('div');
    wrap.className='ff-academic-switcher';
    wrap.innerHTML=`
      <section class="ff-academic-panel" aria-label="Choose academic year">
        <div class="ff-step">Step 01 · Choose your year</div>
        <div class="ff-year-grid">
          <button class="ff-year-card active" type="button" aria-pressed="true"><b>Year 1</b><span>Foundations, current modules and exam preparation.</span></button>
          <button class="ff-year-card" type="button" disabled><b>Year 2</b><span>Resources will appear as they are published.</span></button>
          <button class="ff-year-card" type="button" disabled><b>Year 3</b><span>Planned for future FinalForge releases.</span></button>
          <button class="ff-year-card" type="button" disabled><b>Year 4</b><span>Advanced study workspace coming later.</span></button>
        </div>
      </section>
      <section class="ff-academic-panel" aria-label="Choose semester">
        <div class="ff-step">Step 02 · Choose semester</div>
        <div class="ff-sem-grid">
          <button class="ff-sem-card active" type="button" aria-pressed="true"><b>Semester 1</b><span>DCN · IP · MC · FC</span></button>
          <button class="ff-sem-card" type="button" disabled><b>Semester 2</b><span>Coming after Semester 1 launch.</span></button>
        </div>
        <div class="ff-academic-note"><i></i><span>Current workspace: Year 1 · Semester 1</span></div>
      </section>`;
    home.insertBefore(wrap,hero);
  }

  function analyticsSection(){
    if($('#analytics'))return;
    const section=document.createElement('section');
    section.id='analytics';
    section.className='section';
    section.setAttribute('aria-hidden','true');
    const roadmap=$('#roadmap');
    (roadmap?.parentNode||$('.main'))?.insertBefore(section,roadmap||null);
    renderAnalytics();
  }

  function renderAnalytics(){
    const host=$('#analytics');if(!host)return;
    const pct=overallPct();
    const attempts=completedAttempts();
    const best=bestScore();
    const completedModules=Object.keys(modules).filter(k=>modulePct(k)>=100).length;
    const moduleRows=Object.entries(modules).map(([key,m])=>{
      const p=modulePct(key);
      return `<div class="ff-module-row"><b>${m.short||key.toUpperCase()}</b><div class="ff-bar"><i style="width:${p}%"></i></div><span>${p}%</span></div>`;
    }).join('');
    const priorities=Object.entries(modules)
      .map(([key,m])=>({key,m,p:modulePct(key),date:new Date(m.date).getTime()}))
      .sort((a,b)=>(a.p-b.p)||(a.date-b.date)).slice(0,3)
      .map(x=>`<div class="ff-priority"><b>${x.m.short} · ${x.m.name}</b><span>${x.p}% complete · ${Math.max(0,100-x.p)}% syllabus still to review</span></div>`).join('');
    host.innerHTML=`
      <div class="ff-analytics-head"><div><div class="kicker">Performance workspace</div><h2>Your learning analytics</h2><div class="muted">Progress, practice history and the areas that need attention next.</div></div><button class="btn primary" type="button" onclick="go('practice')">Start practice</button></div>
      <div class="ff-analytics-grid">
        <article class="ff-metric"><span>Syllabus completion</span><strong>${pct}%</strong><small>Across all four current modules</small></article>
        <article class="ff-metric"><span>Completed modules</span><strong>${completedModules}/4</strong><small>Based on your lesson checklist</small></article>
        <article class="ff-metric"><span>Practice attempts</span><strong>${attempts}</strong><small>Saved completed papers</small></article>
        <article class="ff-metric"><span>Best auto-marked score</span><strong>${best||'—'}${best?'%':''}</strong><small>From available quiz/mock results</small></article>
      </div>
      <div class="ff-analytics-main">
        <article class="ff-chart-card"><h3>Module completion</h3><div class="ff-module-bars">${moduleRows}</div></article>
        <article class="ff-readiness-card"><h3>Exam readiness</h3><div class="ff-ring" style="--ff-ring:${pct*3.6}deg"><b>${pct}%</b></div><div class="muted small" style="text-align:center">Readiness is estimated from completed syllabus blocks.</div></article>
      </div>
      <div class="ff-analytics-main">
        <article class="ff-chart-card"><h3>Revision priorities</h3><div class="ff-priority-list">${priorities||'<div class="ff-priority"><b>No priority data yet</b><span>Mark lessons complete to build your study priorities.</span></div>'}</div></article>
        <article class="ff-readiness-card"><h3>Library coverage</h3><div class="ff-priority-list"><div class="ff-priority"><b>${resources.length} indexed resources</b><span>Lectures, tutorials, practicals and revision material currently available.</span></div><div class="ff-priority"><b>${Object.keys(modules).length} active modules</b><span>Year 1 · Semester 1 workspace.</span></div></div></article>
      </div>`;
  }

  function addAnalyticsNav(){
    const build=(host,mobile=false)=>{
      if(!host||$('[data-go="analytics"]',host))return;
      const btn=document.createElement('button');
      btn.type='button';btn.dataset.go='analytics';
      btn.innerHTML=mobile?'📊 <span>Stats</span>':'📊 <span>Analytics</span>';
      btn.addEventListener('click',()=>{renderAnalytics();window.go?.('analytics')});
      const roadmap=$('[data-go="roadmap"]',host);
      host.insertBefore(btn,roadmap||null);
    };
    build($('#nav'),false);
    build($('#mobileNav'),true);
  }

  function improveHomeActions(){
    const dock=$('#home .quick-dock');if(!dock)return;
    const buttons=$$('button',dock);
    if(buttons[3]&&!buttons[3].dataset.ffAnalytics){
      buttons[3].dataset.ffAnalytics='1';
      buttons[3].setAttribute('onclick',"go('analytics')");
      buttons[3].innerHTML='<span>📊</span><b>Analytics</b><small>Progress & readiness</small>';
    }
  }

  function decoratePractice(){
    const practice=$('#practice');if(!practice)return;
    const head=$(':scope>.section-head',practice);
    if(head&&!$('.ff-practice-badge',head)){
      const badge=document.createElement('span');
      badge.className='pill ff-practice-badge';
      badge.textContent='Adaptive study workspace';
      head.appendChild(badge);
    }
  }

  function patchAnalyticsNavigation(){
    if(window.__ffNextUiGoPatched)return;
    const original=window.go;
    if(typeof original!=='function')return;
    window.go=function(id){
      if(String(id)==='analytics')renderAnalytics();
      return original.apply(this,arguments);
    };
    window.__ffNextUiGoPatched=true;
  }

  function install(){
    if(installed)return;
    const app=$('.app');if(!app)return;
    installed=true;
    document.documentElement.classList.add('ff-next-ui');
    academicSwitcher();
    analyticsSection();
    addAnalyticsNav();
    improveHomeActions();
    decoratePractice();
    patchAnalyticsNavigation();

    document.addEventListener('click',e=>{
      const btn=e.target.closest?.('[data-go="analytics"]');
      if(btn)renderAnalytics();
    },{passive:true});

    addEventListener('finalforge-mobile-navigate',e=>{
      if(e.detail?.id==='analytics')renderAnalytics();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  addEventListener('finalforge-ready',()=>{install();setTimeout(()=>{addAnalyticsNav();patchAnalyticsNavigation();},180)},{once:true});
  setTimeout(()=>{install();addAnalyticsNav();patchAnalyticsNavigation();},700);
})();
