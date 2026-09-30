/* FinalForge Adaptive Practice v9 — weak-area recall and random papers using account-scoped local exam insight. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PRACTICE_ADAPTIVE_V9)return;
  window.FINALFORGE_PRACTICE_ADAPTIVE_V9=Object.freeze({version:'9.0.0',mode:'adaptive-practice'});

  const ACTIVE_KEY='finalforge_exam_v4_active';
  const INSIGHTS_KEY='finalforge_exam_v7_insights';
  const MAX_RECENT=5;
  const DEFAULT_COUNT=10;
  const $=(selector,root=document)=>root.querySelector(selector);
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const BANK=window.EXAMHUB_PRACTICE||{};
  const MODULES=(window.FINALFORGE_DATA||window.EXAMHUB_DATA||{}).modules||{};
  let queued=0;

  function notify(message){
    if(typeof window.toast==='function')window.toast(message);
    else console.info('[FinalForge adaptive]',message);
  }

  function topicFor(question){
    const named=String(question?.topic||'').trim();
    if(named)return named;
    const coverage=Number(question?.coverage);
    if(Number.isFinite(coverage)&&coverage>0)return `Lecture ${coverage}`;
    return 'General';
  }

  function currentModule(){
    const active=$('[data-practice-module].active')?.dataset.practiceModule;
    if(active&&MODULES[active])return active;
    const recent=read(INSIGHTS_KEY,[]).find(item=>item?.module&&MODULES[item.module])?.module;
    return recent||Object.keys(MODULES)[0]||'';
  }

  function performanceLabel(percent){
    if(percent>=85)return 'Strong';
    if(percent>=70)return 'On track';
    if(percent>=55)return 'Developing';
    return 'Needs revision';
  }

  function aggregate(module){
    const rows=read(INSIGHTS_KEY,[]).filter(item=>item?.module===module&&Number.isFinite(item.percent)).slice(0,MAX_RECENT);
    if(!rows.length)return {attempts:0,readiness:null,label:'Baseline needed',topics:[],weak:[],strong:null};
    const readiness=Math.round(rows.reduce((sum,row)=>sum+Number(row.percent||0),0)/rows.length);
    const map={};
    rows.forEach(row=>(row.topics||[]).forEach(topic=>{
      const name=String(topic?.topic||'').trim();if(!name)return;
      if(!map[name])map[name]={topic:name,correct:0,total:0};
      map[name].correct+=Number(topic.correct)||0;
      map[name].total+=Number(topic.total)||0;
    }));
    const topics=Object.values(map).map(row=>({...row,percent:row.total?Math.round(row.correct/row.total*100):0})).sort((a,b)=>a.percent-b.percent||b.total-a.total||a.topic.localeCompare(b.topic));
    const weak=topics.filter(row=>row.percent<75).slice(0,4);
    const strong=[...topics].sort((a,b)=>b.percent-a.percent||b.total-a.total)[0]||null;
    return {attempts:rows.length,readiness,label:performanceLabel(readiness),topics,weak,strong};
  }

  function randomSeed(){
    try{
      if(globalThis.crypto?.getRandomValues){const value=new Uint32Array(1);crypto.getRandomValues(value);return value[0]>>>0}
    }catch{}
    return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
  }

  function rng(seed){
    let value=seed>>>0;
    return ()=>{
      value+=0x6D2B79F5;
      let t=value;
      t=Math.imul(t^t>>>15,t|1);
      t^=t+Math.imul(t^t>>>7,t|61);
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }

  function shuffled(items,seed){
    const copy=[...(items||[])],random=rng(seed);
    for(let index=copy.length-1;index>0;index--){
      const target=Math.floor(random()*(index+1));
      [copy[index],copy[target]]=[copy[target],copy[index]];
    }
    return copy;
  }

  function unique(items){
    const seen=new Set();
    return items.filter(item=>{
      const key=String(item?.q||'').trim();
      if(!key||seen.has(key))return false;
      seen.add(key);return true;
    });
  }

  function makeQuestion(raw,index,seed,sectionPrefix){
    const topic=topicFor(raw);
    return {
      id:`v9-${seed.toString(36)}-${index}-${Math.random().toString(36).slice(2,7)}`,
      kind:'mcq',section:`${sectionPrefix} · ${topic}`,marks:1,
      q:raw?.q||'',o:Array.isArray(raw?.o)?raw.o:[],a:raw?.a,e:raw?.e||'',p:raw?.p||[],s:raw?.s||'',
      snippet:raw?.snippet||'',topic,coverage:Number(raw?.coverage)||0,starter:'',pattern:''
    };
  }

  function buildRecall(module,mode='adaptive',count=DEFAULT_COUNT){
    const source=Array.isArray(BANK[module]?.mcq)?BANK[module].mcq.filter(item=>item&&item.q&&Array.isArray(item.o)):[];
    if(!source.length)return null;
    const summary=aggregate(module),seed=randomSeed(),limit=Math.min(Math.max(5,Number(count)||DEFAULT_COUNT),source.length);
    let chosen=[];
    let focusTopics=[];

    if(mode==='adaptive'&&summary.weak.length){
      focusTopics=summary.weak.slice(0,3).map(row=>row.topic);
      const focusSet=new Set(focusTopics);
      const weakPool=shuffled(source.filter(item=>focusSet.has(topicFor(item))),seed^0x9e3779b9);
      const broadPool=shuffled(source.filter(item=>!focusSet.has(topicFor(item))),seed^0x85ebca6b);
      const weakTarget=Math.min(weakPool.length,Math.max(1,Math.round(limit*.7)));
      chosen=unique([...weakPool.slice(0,weakTarget),...broadPool]).slice(0,limit);
    }else{
      chosen=unique(shuffled(source,seed)).slice(0,limit);
    }

    if(chosen.length<limit){
      chosen=unique([...chosen,...shuffled(source,seed^0xc2b2ae35)]).slice(0,limit);
    }
    if(!chosen.length)return null;

    const now=Date.now(),adaptive=mode==='adaptive'&&focusTopics.length>0;
    const title=adaptive?'Adaptive Weak-Area Drill':mode==='adaptive'?'Adaptive Baseline Recall':'Random Recall Paper';
    return {
      version:5,
      id:`v9-${now.toString(36)}-${seed.toString(36)}`,
      module,mode:adaptive?'adaptive':'random-recall',variant:1,title,
      createdAt:now,endAt:now+20*60000,duration:20*60,current:0,answers:{},flags:{},finished:false,
      questions:chosen.map((raw,index)=>makeQuestion(raw,index,seed,adaptive?'Weak-area recall':'Random recall')),
      adaptiveMeta:{version:1,seed,sourceAttempts:summary.attempts,focusTopics,generatedAt:now}
    };
  }

  function launchRecall(mode){
    const module=currentModule();
    if(!module)return notify('Choose a module first.');
    const saved=read(ACTIVE_KEY,null);
    if(saved&&!saved.finished&&!confirm('Start this practice set? Your current saved attempt will be replaced.'))return;
    const exam=buildRecall(module,mode,DEFAULT_COUNT);
    if(!exam)return notify('This module does not have enough auto-marked MCQs for focused recall yet.');
    if(!write(ACTIVE_KEY,exam))return notify('FinalForge could not save the new practice attempt.');
    if(typeof window.resumePracticeExam==='function')window.resumePracticeExam();
    else notify('Exam Studio is still loading. Try again in a moment.');
  }

  function launchRandomFullPaper(){
    const button=$('[data-start-mode="generated"]','#practiceWorkbench');
    if(button){button.click();return}
    notify('Random full-paper generation is not available for this module right now.');
  }

  function readinessHTML(summary){
    if(summary.readiness===null)return '<strong>—</strong><span>Complete an auto-marked attempt to create a baseline.</span>';
    return `<strong>${summary.readiness}%</strong><span>${esc(summary.label)} · last ${summary.attempts} attempt${summary.attempts===1?'':'s'}</span>`;
  }

  function renderPanel(){
    const hub=$('#practiceWorkbench .ff-v5-practice-hub');if(!hub)return false;
    const module=currentModule();if(!module)return false;
    const existing=$('.ff-v9-adaptive',hub);
    if(existing?.dataset.v9Module===module)return true;
    existing?.remove();

    const source=Array.isArray(BANK[module]?.mcq)?BANK[module].mcq.filter(item=>item&&item.q):[];
    const summary=aggregate(module),hasMcq=source.length>=5;
    const weak=summary.weak.length
      ?summary.weak.map(item=>`<span>${esc(item.topic)} <b>${item.percent}%</b></span>`).join('')
      :'<span class="ff-v9-neutral">No repeated weak MCQ topic yet</span>';
    const focusCopy=summary.weak.length
      ?`About 70% of the next recall set is drawn from your lowest recent topics, with the rest mixed in for retention.`
      :`Start with a broad baseline. Once FinalForge has auto-marked history, this drill will shift toward weaker topics.`;

    const section=document.createElement('section');
    section.className='ff-v9-adaptive';section.dataset.v9Module=module;section.setAttribute('aria-label','Adaptive weak-area practice');
    section.innerHTML=`
      <div class="ff-v9-head">
        <div><small>v73 · Adaptive Practice</small><h3>Train what needs work, not only what feels easy.</h3><p>Targeting uses only recent auto-marked MCQ results. Written and Java answers remain self-marked.</p></div>
        <div class="ff-v9-readiness" aria-label="Recent MCQ readiness">${readinessHTML(summary)}</div>
      </div>
      <div class="ff-v9-focus"><div><small>Current weak-area signal</small><div>${weak}</div></div>${summary.strong?`<span class="ff-v9-strong">Strongest · ${esc(summary.strong.topic)} ${summary.strong.percent}%</span>`:''}</div>
      <div class="ff-v9-grid">
        <article class="ff-v9-card featured"><div><span>Adaptive</span><h4>${summary.weak.length?'Weak-area drill':'Baseline recall'}</h4><p>${esc(focusCopy)}</p></div><div><b>10 MCQs · 20 min</b><button class="btn primary" type="button" data-v9-adaptive ${hasMcq?'':'disabled'}>${summary.weak.length?'Practice weak areas':'Build baseline'}</button></div></article>
        <article class="ff-v9-card"><div><span>Random recall</span><h4>Fresh 10-question mix</h4><p>Generates a new randomized MCQ set from the selected module each time.</p></div><div><b>New seed every attempt</b><button class="btn" type="button" data-v9-random ${hasMcq?'':'disabled'}>Random 10</button></div></article>
        <article class="ff-v9-card"><div><span>Random paper</span><h4>Full exam structure</h4><p>Uses Exam Studio's existing module blueprint to create a fresh full paper.</p></div><div><b>Timer + autosave + review</b><button class="btn" type="button" data-v9-full>Generate full paper</button></div></article>
      </div>
      ${hasMcq?'':`<p class="ff-v9-unavailable">Adaptive MCQ targeting is unavailable for this module because its current bank is not auto-marked. Full-paper practice remains available.</p>`}`;

    const anchor=$('.ff-v5-action-grid',hub);
    if(anchor)anchor.insertAdjacentElement('beforebegin',section);else hub.prepend(section);
    $('[data-v9-adaptive]',section)?.addEventListener('click',()=>launchRecall('adaptive'));
    $('[data-v9-random]',section)?.addEventListener('click',()=>launchRecall('random'));
    $('[data-v9-full]',section)?.addEventListener('click',launchRandomFullPaper);
    return true;
  }

  function queueRender(){
    const token=++queued;
    [0,60,160,320,620].forEach(delay=>setTimeout(()=>{if(token===queued)renderPanel()},delay));
  }

  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-practice-module],[data-results-close],[data-results-retry],[data-exam-exit]'))queueRender();
  },true);
  addEventListener('finalforge-practice-insight-saved',queueRender);
  addEventListener('finalforge-account-storage-bound',queueRender);
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='practice')queueRender()});
  addEventListener('finalforge-practice-v5-ready',queueRender);
  addEventListener('finalforge-ready',queueRender,{once:true});
  addEventListener('pageshow',queueRender,{passive:true});

  window.FinalForgeAdaptivePractice={aggregate,buildRecall,renderPanel};
  queueRender();
})();