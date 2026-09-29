/* FinalForge Student Readiness v10 — MCQ readiness, study progress and actionable analytics. */
(()=>{
  'use strict';
  if(window.FINALFORGE_STUDENT_READINESS_V10)return;
  window.FINALFORGE_STUDENT_READINESS_V10=Object.freeze({version:'10.0.0',mode:'readiness-analytics'});

  const INSIGHTS_KEY='finalforge_exam_v7_insights';
  const PROGRESS_KEY='finalforge_progress';
  const HISTORY_KEY='finalforge_exam_v4_history';
  const MAX_MODULE_ATTEMPTS=5;
  const MAX_OVERALL_ATTEMPTS=20;
  const $=(selector,root=document)=>root.querySelector(selector);
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const average=values=>values.length?Math.round(values.reduce((sum,value)=>sum+Number(value||0),0)/values.length):null;
  const DATA=()=>window.FINALFORGE_DATA||window.EXAMHUB_DATA||{};
  let queued=0;

  function modules(){return Object.entries(DATA().modules||{})}
  function validInsights(){
    return read(INSIGHTS_KEY,[])
      .filter(item=>item&&item.module&&Number.isFinite(item.percent))
      .sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0));
  }
  function history(){return read(HISTORY_KEY,[]).filter(Boolean).sort((a,b)=>(Number(b.finishedAt)||0)-(Number(a.finishedAt)||0))}
  function progress(){return read(PROGRESS_KEY,{})||{}}

  function moduleCompletion(moduleKey){
    const module=DATA().modules?.[moduleKey];
    if(!module?.lessons?.length)return 0;
    const state=progress()[moduleKey]||{};
    const done=module.lessons.reduce((count,_lesson,index)=>count+(state[index]?1:0),0);
    return Math.round(done/module.lessons.length*100);
  }

  function performanceLabel(percent){
    if(percent===null||percent===undefined)return 'No baseline';
    if(percent>=85)return 'Strong';
    if(percent>=70)return 'On track';
    if(percent>=55)return 'Developing';
    return 'Needs revision';
  }

  function evidenceLabel(attempts){
    if(!attempts)return 'No baseline';
    if(attempts===1)return 'Early signal';
    if(attempts<4)return 'Growing evidence';
    return 'Established pattern';
  }

  function aggregateTopics(rows){
    const map={};
    rows.forEach(row=>(row.topics||[]).forEach(topic=>{
      const name=String(topic?.topic||'').trim();if(!name)return;
      if(!map[name])map[name]={topic:name,correct:0,total:0};
      map[name].correct+=Number(topic.correct)||0;
      map[name].total+=Number(topic.total)||0;
    }));
    return Object.values(map)
      .map(row=>({...row,percent:row.total?Math.round(row.correct/row.total*100):0}))
      .sort((a,b)=>a.percent-b.percent||b.total-a.total||a.topic.localeCompare(b.topic));
  }

  function moduleSnapshot(moduleKey){
    const rows=validInsights().filter(item=>item.module===moduleKey).slice(0,MAX_MODULE_ATTEMPTS);
    const readiness=average(rows.map(row=>row.percent));
    const topics=aggregateTopics(rows);
    const weak=topics.filter(row=>row.percent<75).slice(0,3);
    const strong=[...topics].sort((a,b)=>b.percent-a.percent||b.total-a.total)[0]||null;
    const latest=rows[0]?.percent??null;
    const previous=rows[1]?.percent??null;
    const trend=latest!==null&&previous!==null?latest-previous:null;
    return {
      module:moduleKey,
      attempts:rows.length,
      readiness,
      label:performanceLabel(readiness),
      evidence:evidenceLabel(rows.length),
      completion:moduleCompletion(moduleKey),
      weak,
      strong,
      latest,
      trend,
      lastAt:Number(rows[0]?.at)||0
    };
  }

  function overallSnapshot(){
    const recent=validInsights().slice(0,MAX_OVERALL_ATTEMPTS);
    const moduleRows=modules().map(([key,mod])=>({...moduleSnapshot(key),name:mod.name||mod.code||key,short:mod.short||key.toUpperCase(),icon:mod.icon||'◎'}));
    const readiness=average(recent.map(row=>row.percent));
    const studyCompletion=average(moduleRows.map(row=>row.completion))??0;
    const newest=recent.slice(0,3).map(row=>row.percent);
    const prior=recent.slice(3,6).map(row=>row.percent);
    const latestAverage=average(newest),priorAverage=average(prior);
    const trend=latestAverage!==null&&priorAverage!==null?latestAverage-priorAverage:null;
    const modulesWithBaseline=moduleRows.filter(row=>row.readiness!==null).length;
    return {
      readiness,
      label:performanceLabel(readiness),
      trend,
      studyCompletion,
      modulesWithBaseline,
      moduleCount:moduleRows.length,
      attempts:recent.length,
      completedPapers:history().length,
      lastAt:Number(recent[0]?.at)||0,
      moduleRows,
      recent
    };
  }

  function trendText(delta){
    if(delta===null)return 'More attempts needed';
    if(delta>0)return `+${delta} pts vs prior 3`;
    if(delta<0)return `${delta} pts vs prior 3`;
    return 'Stable vs prior 3';
  }

  function freshness(timestamp){
    if(!timestamp)return 'No auto-marked attempt yet';
    const diff=Math.max(0,Date.now()-timestamp);
    const day=86400000;
    if(diff<3600000)return 'Updated within the last hour';
    if(diff<day)return 'Updated today';
    const days=Math.max(1,Math.round(diff/day));
    return `Updated ${days} day${days===1?'':'s'} ago`;
  }

  function priorityRows(rows){
    return [...rows].sort((a,b)=>{
      const ar=a.readiness===null?101:a.readiness;
      const br=b.readiness===null?101:b.readiness;
      if(ar!==br)return ar-br;
      return a.completion-b.completion;
    });
  }

  function recommended(rows){
    const withSignal=rows.filter(row=>row.readiness!==null);
    if(withSignal.length)return [...withSignal].sort((a,b)=>a.readiness-b.readiness||a.completion-b.completion)[0];
    return [...rows].sort((a,b)=>a.completion-b.completion)[0]||null;
  }

  function scoreHTML(value,label){
    const safe=value===null?0:clamp(value,0,100);
    return `<div class="ff-v10-score-ring" style="--ff-v10-score:${safe}" aria-label="${value===null?'No readiness baseline':`${value}% MCQ readiness`}"><div><strong>${value===null?'—':`${value}%`}</strong><span>${esc(label)}</span></div></div>`;
  }

  function heroHTML(snapshot){
    return `<section class="ff-v10-readiness-hero" aria-labelledby="ffV10ReadinessTitle">
      <div class="ff-v10-hero-copy"><small>v74 · Student readiness</small><h3 id="ffV10ReadinessTitle">One view for exam signals and study progress.</h3><p>Readiness uses only recent auto-marked MCQs. Lesson completion is shown separately; written and Java answers remain self-marked.</p><div class="ff-v10-data-note"><span></span>${esc(freshness(snapshot.lastAt))}</div></div>
      ${scoreHTML(snapshot.readiness,snapshot.label)}
      <div class="ff-v10-hero-stats">
        <article><span>Recent MCQ trend</span><strong>${snapshot.trend===null?'—':`${snapshot.trend>0?'+':''}${snapshot.trend} pts`}</strong><small>${esc(trendText(snapshot.trend))}</small></article>
        <article><span>Study completion</span><strong>${snapshot.studyCompletion}%</strong><small>Lesson completion · not part of readiness score</small></article>
        <article><span>Module baselines</span><strong>${snapshot.modulesWithBaseline}/${snapshot.moduleCount}</strong><small>${snapshot.attempts} recent scored attempt${snapshot.attempts===1?'':'s'} considered</small></article>
      </div>
    </section>`;
  }

  function moduleRowsHTML(rows){
    return priorityRows(rows).map(row=>{
      const readiness=row.readiness===null?'—':`${row.readiness}%`;
      const weak=row.weak[0]?.topic||'No repeated weak topic';
      const trend=row.trend===null?'':` · ${row.trend>0?'+':''}${row.trend} pt latest trend`;
      return `<article class="ff-v10-module-row" data-v10-module-row="${esc(row.module)}">
        <div class="ff-v10-module-name"><span>${esc(row.icon)}</span><div><b>${esc(row.short)}</b><small>${esc(row.name)}</small></div></div>
        <div class="ff-v10-meter-group"><div><span>MCQ readiness</span><b>${readiness}</b></div><div class="ff-v10-meter"><i style="width:${row.readiness===null?0:clamp(row.readiness,0,100)}%"></i></div><small>${esc(row.evidence)}${esc(trend)}</small></div>
        <div class="ff-v10-meter-group completion"><div><span>Lesson completion</span><b>${row.completion}%</b></div><div class="ff-v10-meter"><i style="width:${clamp(row.completion,0,100)}%"></i></div><small>Tracked separately from exam readiness</small></div>
        <div class="ff-v10-focus"><span>Focus next</span><b>${esc(weak)}</b><small>${row.weak[0]?`${row.weak[0].percent}% recent topic accuracy`:row.attempts?'No topic below 75% in recent evidence':'Complete an auto-marked attempt to build a baseline'}</small></div>
        <button class="btn" type="button" data-v10-practice="${esc(row.module)}">Practice</button>
      </article>`;
    }).join('');
  }

  function recentBarsHTML(rows){
    const chronological=[...rows].slice(0,8).reverse();
    if(!chronological.length)return '<div class="ff-v10-empty"><b>No MCQ readiness history yet</b><span>Submit an auto-marked paper to start the trend view.</span></div>';
    return `<div class="ff-v10-trend-bars" role="img" aria-label="Recent MCQ readiness attempts from oldest to newest">${chronological.map((row,index)=>{
      const value=clamp(row.percent,0,100);
      const label=String(row.module||'').toUpperCase();
      return `<div class="ff-v10-trend-col" title="${esc(row.title||`${label} attempt`)} · ${value}%"><span>${value}%</span><div><i style="height:${Math.max(5,value)}%"></i></div><small>${esc(label||String(index+1))}</small></div>`;
    }).join('')}</div><div class="ff-v10-trend-axis"><span>Older</span><span>Newest</span></div>`;
  }

  function insightPanelHTML(snapshot){
    const target=recommended(snapshot.moduleRows);
    const topicMap=aggregateTopics(snapshot.recent);
    const weakest=topicMap.filter(row=>row.percent<75).slice(0,5);
    const weakHTML=weakest.length?weakest.map(row=>`<span>${esc(row.topic)} <b>${row.percent}%</b></span>`).join(''):'<span class="neutral">No repeated weak topic across recent MCQs</span>';
    return `<div class="ff-v10-analytics-grid">
      <article class="ff-v10-panel ff-v10-trend-panel"><header><div><small>Performance trend</small><h3>Recent auto-marked MCQs</h3></div><span>${snapshot.attempts} / ${MAX_OVERALL_ATTEMPTS} recent</span></header>${recentBarsHTML(snapshot.recent)}</article>
      <article class="ff-v10-panel ff-v10-focus-panel"><header><div><small>Weak-area signal</small><h3>Topics to reinforce</h3></div></header><div class="ff-v10-topic-chips">${weakHTML}</div>${target?`<div class="ff-v10-next"><span>Recommended module</span><b>${esc(target.short)} · ${esc(target.name)}</b><p>${target.readiness===null?`Build an MCQ baseline while continuing lessons (${target.completion}% complete).`:`Recent MCQ readiness is ${target.readiness}%. Use adaptive practice, then compare the next result.`}</p><div><button class="btn primary" type="button" data-v10-practice="${esc(target.module)}">Open adaptive practice</button><button class="btn" type="button" data-v10-module="${esc(target.module)}">Continue lessons</button></div></div>`:''}</article>
    </div>`;
  }

  function render(){
    const section=$('#analytics');
    if(!section||!document.body.classList.contains('ff-authenticated'))return false;
    const metricGrid=$('#ffV3MetricGrid',section),analyticsGrid=$('.ff-v3-analytics-grid',section);
    if(!metricGrid||!analyticsGrid)return false;
    const snapshot=overallSnapshot();

    section.classList.add('ff-v10-ready');
    let hero=$('#ffV10ReadinessHero',section);
    if(!hero){
      hero=document.createElement('div');hero.id='ffV10ReadinessHero';
      metricGrid.insertAdjacentElement('beforebegin',hero);
    }
    hero.innerHTML=heroHTML(snapshot);

    metricGrid.classList.add('ff-v10-summary-grid');
    metricGrid.innerHTML=`
      <article class="card ff-v3-metric ff-v10-summary"><span>MCQ readiness</span><strong>${snapshot.readiness===null?'—':`${snapshot.readiness}%`}</strong><small>${snapshot.readiness===null?'Complete a scored paper to establish a baseline':`${esc(snapshot.label)} · last ${snapshot.attempts} scored attempt${snapshot.attempts===1?'':'s'}`}</small></article>
      <article class="card ff-v3-metric ff-v10-summary"><span>Study completion</span><strong>${snapshot.studyCompletion}%</strong><small>Average lesson completion across ${snapshot.moduleCount} module${snapshot.moduleCount===1?'':'s'}</small></article>
      <article class="card ff-v3-metric ff-v10-summary"><span>Completed papers</span><strong>${snapshot.completedPapers}</strong><small>Saved Exam Studio submissions</small></article>
      <article class="card ff-v3-metric ff-v10-summary"><span>Readiness coverage</span><strong>${snapshot.modulesWithBaseline}/${snapshot.moduleCount}</strong><small>Modules with recent auto-marked evidence</small></article>`;

    let matrix=$('#ffV10ModuleMatrix',section);
    if(!matrix){
      matrix=document.createElement('section');matrix.id='ffV10ModuleMatrix';matrix.className='ff-v10-module-matrix';
      analyticsGrid.insertAdjacentElement('beforebegin',matrix);
    }
    matrix.innerHTML=`<header><div><small>Module readiness matrix</small><h3>Separate exam evidence from study completion</h3><p>MCQ readiness is the mean of up to ${MAX_MODULE_ATTEMPTS} recent auto-marked attempts per module. Completion never inflates the readiness percentage.</p></div><span>${snapshot.modulesWithBaseline} baseline${snapshot.modulesWithBaseline===1?'':'s'} active</span></header><div class="ff-v10-module-list">${moduleRowsHTML(snapshot.moduleRows)}</div>`;

    let intelligence=$('#ffV10Intelligence',section);
    if(!intelligence){
      intelligence=document.createElement('section');intelligence.id='ffV10Intelligence';
      matrix.insertAdjacentElement('afterend',intelligence);
    }
    intelligence.innerHTML=insightPanelHTML(snapshot);
    return true;
  }

  function openPractice(module){
    if(!module)return;
    window.go?.('practice');
    requestAnimationFrame(()=>{
      window.setPracticeMod?.(module);
      setTimeout(()=>$('#practiceWorkbench')?.scrollIntoView({behavior:'smooth',block:'start'}),60);
    });
  }

  function openModule(module){
    if(!module)return;
    window.go?.('modules');
    requestAnimationFrame(()=>window.openModule?.(module));
  }

  function queueRender(){
    const token=++queued;
    [0,50,140,300].forEach(delay=>setTimeout(()=>{if(token===queued)render()},delay));
  }

  document.addEventListener('click',event=>{
    const practice=event.target?.closest?.('[data-v10-practice]');
    if(practice){openPractice(practice.dataset.v10Practice);return}
    const module=event.target?.closest?.('[data-v10-module]');
    if(module)openModule(module.dataset.v10Module);
  });
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='analytics')queueRender()});
  addEventListener('finalforge-practice-insight-saved',queueRender);
  addEventListener('finalforge-account-storage-bound',queueRender);
  addEventListener('storage',event=>{if([INSIGHTS_KEY,PROGRESS_KEY,HISTORY_KEY].includes(event.key))queueRender()});
  addEventListener('finalforge-ready',queueRender,{once:true});
  addEventListener('pageshow',queueRender,{passive:true});

  window.FinalForgeStudentReadiness={moduleSnapshot,overallSnapshot,render};
  queueRender();
})();