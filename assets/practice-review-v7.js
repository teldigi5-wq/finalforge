/* FinalForge Practice Review v7 — event-driven smart results, weak-area insight and readiness guidance. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PRACTICE_REVIEW_V7)return;
  window.FINALFORGE_PRACTICE_REVIEW_V7=Object.freeze({version:'7.0.0',mode:'smart-review'});

  const ACTIVE_KEY='finalforge_exam_v4_active';
  const INSIGHTS_KEY='finalforge_exam_v7_insights';
  const MAX_INSIGHTS=40;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  const readActive=()=>read(ACTIVE_KEY,null);

  let queuedSnapshot=null;
  let decorateToken='';

  function topicFor(question){
    const named=String(question?.topic||'').trim();
    if(named)return named;
    const coverage=Number(question?.coverage);
    if(Number.isFinite(coverage)&&coverage>0)return `Lecture ${coverage}`;
    return String(question?.section||'General').replace(/^Part\s*\d+\s*·\s*/i,'').trim()||'General';
  }

  function fmtDuration(seconds){
    const safe=Math.max(0,Math.round(Number(seconds)||0));
    const hours=Math.floor(safe/3600),minutes=Math.floor((safe%3600)/60),secs=safe%60;
    if(hours)return `${hours}h ${String(minutes).padStart(2,'0')}m`;
    if(minutes)return `${minutes}m ${String(secs).padStart(2,'0')}s`;
    return `${secs}s`;
  }

  function performanceLabel(percent){
    if(percent>=85)return 'Strong';
    if(percent>=70)return 'On track';
    if(percent>=55)return 'Developing';
    return 'Needs revision';
  }

  function buildInsight(snapshot,auto=false){
    if(!snapshot||!Array.isArray(snapshot.questions))return null;
    const answers=snapshot.answers||{};
    const flags=snapshot.flags||{};
    const topics={};
    let mcqTotal=0,mcqCorrect=0,mcqAnswered=0,answered=0;

    snapshot.questions.forEach(question=>{
      const value=answers[question.id];
      const hasAnswer=question.kind==='mcq'?value!==undefined&&value!==null:Boolean(String(value||'').trim());
      if(hasAnswer)answered++;
      if(question.kind!=='mcq')return;
      mcqTotal++;
      if(hasAnswer)mcqAnswered++;
      const correct=hasAnswer&&Number(value)===Number(question.a);
      if(correct)mcqCorrect++;
      const topic=topicFor(question);
      if(!topics[topic])topics[topic]={topic,total:0,correct:0,answered:0,unanswered:0};
      topics[topic].total++;
      if(hasAnswer)topics[topic].answered++;else topics[topic].unanswered++;
      if(correct)topics[topic].correct++;
    });

    const percent=mcqTotal?Math.round(mcqCorrect/mcqTotal*100):null;
    const created=Number(snapshot.createdAt)||Date.now();
    const duration=Number(snapshot.duration)||0;
    const elapsed=Math.max(0,Math.round((Date.now()-created)/1000));
    const timeUsed=duration?Math.min(duration,elapsed):elapsed;
    const topicRows=Object.values(topics).map(row=>({...row,percent:row.total?Math.round(row.correct/row.total*100):0})).sort((a,b)=>a.percent-b.percent||b.total-a.total);
    const needsReview=topicRows.filter(row=>row.percent<75).slice(0,4);
    const strongest=[...topicRows].sort((a,b)=>b.percent-a.percent||b.total-a.total)[0]||null;
    const flagged=Object.values(flags).filter(Boolean).length;

    return {
      id:String(snapshot.id||`${Date.now()}`),
      module:String(snapshot.module||''),
      title:String(snapshot.title||'Model paper'),
      mode:String(snapshot.mode||'mock'),
      variant:Number(snapshot.variant)||1,
      at:Date.now(),
      auto:Boolean(auto),
      total:snapshot.questions.length,
      answered,
      unanswered:Math.max(0,snapshot.questions.length-answered),
      flagged,
      mcqTotal,
      mcqAnswered,
      mcqCorrect,
      mcqWrong:Math.max(0,mcqAnswered-mcqCorrect),
      percent,
      label:percent===null?'Self-mark required':performanceLabel(percent),
      timeUsed,
      topics:topicRows,
      needsReview,
      strongest
    };
  }

  function saveInsight(insight){
    if(!insight)return;
    const previous=read(INSIGHTS_KEY,[]).filter(item=>item&&item.id!==insight.id);
    write(INSIGHTS_KEY,[insight,...previous].slice(0,MAX_INSIGHTS));
    window.dispatchEvent(new CustomEvent('finalforge-practice-insight-saved',{detail:{module:insight.module,id:insight.id}}));
  }

  function statusFor(question,answers){
    const value=answers?.[question.id];
    const has=question.kind==='mcq'?value!==undefined&&value!==null:Boolean(String(value||'').trim());
    if(!has)return 'unanswered';
    if(question.kind!=='mcq')return 'self-mark';
    return Number(value)===Number(question.a)?'correct':'incorrect';
  }

  function summaryHTML(insight){
    const percent=insight.percent;
    const score=percent===null?'—':`${percent}%`;
    const recommendation=insight.needsReview.length
      ? `Focus next on ${insight.needsReview.slice(0,2).map(item=>item.topic).join(' and ')}.`
      : percent===null?'Use the self-mark guides below, then retry the paper to compare your structure.':'No major MCQ weakness detected in this attempt. Repeat with a harder paper to confirm consistency.';
    const topics=insight.topics.length?insight.topics.map(item=>`<div class="ff-v7-topic-row"><div><b>${esc(item.topic)}</b><span>${item.correct}/${item.total} correct</span></div><div class="ff-v7-topic-meter" aria-label="${esc(item.topic)} ${item.percent}%"><i style="width:${clamp(item.percent,0,100)}%"></i></div><strong>${item.percent}%</strong></div>`).join(''):'<p class="ff-v7-empty-copy">This paper has no auto-marked MCQ topics. Use the self-mark guides below for written questions.</p>';
    return `<section class="ff-v7-summary" aria-label="Attempt insight">
      <div class="ff-v7-summary-head"><div><span>Smart review</span><h3>Know what to revise next</h3><p>Readiness is based only on auto-marked MCQs; written and Java answers remain self-marked.</p></div><div class="ff-v7-readiness-ring"><strong>${score}</strong><span>${esc(insight.label)}</span></div></div>
      <div class="ff-v7-metric-grid">
        <article><span>MCQ accuracy</span><strong>${score}</strong><small>${insight.mcqCorrect}/${insight.mcqTotal||0} correct</small></article>
        <article><span>Completion</span><strong>${insight.answered}/${insight.total}</strong><small>${insight.unanswered} unanswered</small></article>
        <article><span>Time used</span><strong>${esc(fmtDuration(insight.timeUsed))}</strong><small>${insight.auto?'Timer expired':'Submitted attempt'}</small></article>
        <article><span>Marked review</span><strong>${insight.flagged}</strong><small>Flagged questions</small></article>
      </div>
      <div class="ff-v7-insight-grid">
        <div class="ff-v7-topic-card"><div class="ff-v7-card-title"><span>Topic accuracy</span>${insight.strongest?`<small>Strongest: ${esc(insight.strongest.topic)}</small>`:''}</div>${topics}</div>
        <aside class="ff-v7-next-card"><span>Recommended next step</span><h4>${esc(recommendation)}</h4>${insight.needsReview.length?`<div class="ff-v7-weak-chips">${insight.needsReview.map(item=>`<span>${esc(item.topic)} · ${item.percent}%</span>`).join('')}</div>`:''}<button class="btn primary" type="button" data-v7-jump-review>Review weak answers</button></aside>
      </div>
      <div class="ff-v7-review-filter" role="group" aria-label="Filter reviewed questions"><button class="active" type="button" data-v7-filter="all">All</button><button type="button" data-v7-filter="needs-review">Needs review</button><button type="button" data-v7-filter="correct">Correct</button><button type="button" data-v7-filter="unanswered">Unanswered</button></div>
    </section>`;
  }

  function applyFilter(root,filter){
    $$('.result-review>article',root).forEach(article=>{
      const status=article.dataset.reviewStatus||'self-mark';
      const show=filter==='all'||filter===status||(filter==='needs-review'&&(status==='incorrect'||status==='unanswered'||status==='self-mark'));
      article.hidden=!show;
    });
    $$('[data-v7-filter]',root).forEach(button=>button.classList.toggle('active',button.dataset.v7Filter===filter));
  }

  function decorateResults(snapshot,auto=false){
    const root=$('.ff-v5-results');
    if(!root||root.dataset.ffReviewV7==='1')return false;
    const insight=buildInsight(snapshot,auto);if(!insight)return false;
    root.dataset.ffReviewV7='1';
    saveInsight(insight);

    const hero=$('.result-hero',root);
    if(hero)hero.insertAdjacentHTML('afterend',summaryHTML(insight));
    const articles=$$('.result-review>article',root);
    articles.forEach((article,index)=>{
      const question=snapshot.questions[index];if(!question)return;
      const status=statusFor(question,snapshot.answers||{});
      article.dataset.reviewStatus=status;
      article.classList.add(`ff-v7-review-${status}`);
      const meta=$('.question-meta',article);
      if(meta){
        const topic=document.createElement('span');
        topic.className='ff-v7-topic-chip';topic.textContent=topicFor(question);meta.appendChild(topic);
        const state=document.createElement('span');state.className=`ff-v7-state ff-v7-state-${status}`;
        state.textContent=status==='correct'?'Correct':status==='incorrect'?'Needs review':status==='unanswered'?'Unanswered':'Self-mark';
        meta.appendChild(state);
      }
      if(status==='unanswered')$('.review-answer',article)?.classList.add('unanswered');
    });

    $$('[data-v7-filter]',root).forEach(button=>button.addEventListener('click',()=>applyFilter(root,button.dataset.v7Filter)));
    $('[data-v7-jump-review]',root)?.addEventListener('click',()=>{
      applyFilter(root,'needs-review');
      const target=$('.result-review>article:not([hidden])',root);
      target?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    return true;
  }

  function queueDecorate(snapshot,auto=false){
    if(!snapshot)return;
    queuedSnapshot=snapshot;
    const token=`${snapshot.id||''}-${Date.now()}`;decorateToken=token;
    [0,80,180,360,700].forEach(delay=>setTimeout(()=>{
      if(decorateToken!==token||!queuedSnapshot)return;
      if(decorateResults(queuedSnapshot,auto)){queuedSnapshot=null;decorateToken=''}
    },delay));
  }

  function aggregateRecent(module){
    const rows=read(INSIGHTS_KEY,[]).filter(item=>item?.module===module&&Number.isFinite(item.percent)).slice(0,5);
    if(!rows.length)return null;
    const readiness=Math.round(rows.reduce((sum,row)=>sum+row.percent,0)/rows.length);
    const topicMap={};
    rows.forEach(row=>(row.topics||[]).forEach(topic=>{
      if(!topicMap[topic.topic])topicMap[topic.topic]={topic:topic.topic,correct:0,total:0};
      topicMap[topic.topic].correct+=Number(topic.correct)||0;topicMap[topic.topic].total+=Number(topic.total)||0;
    }));
    const topics=Object.values(topicMap).map(row=>({...row,percent:row.total?Math.round(row.correct/row.total*100):0})).sort((a,b)=>a.percent-b.percent||b.total-a.total);
    return {readiness,label:performanceLabel(readiness),attempts:rows.length,weak:topics.filter(row=>row.percent<75).slice(0,3),strong:[...topics].sort((a,b)=>b.percent-a.percent)[0]||null};
  }

  function currentPracticeModule(){
    return $('[data-practice-module].active')?.dataset.practiceModule||read(INSIGHTS_KEY,[])[0]?.module||'';
  }

  function renderCenterInsight(){
    const hub=$('#practiceWorkbench .ff-v5-practice-hub');if(!hub||$('.ff-v7-readiness',hub))return;
    const module=currentPracticeModule(),summary=aggregateRecent(module);if(!summary)return;
    const panel=document.createElement('section');panel.className='ff-v7-readiness';
    const weak=summary.weak.length?summary.weak.map(item=>`<span>${esc(item.topic)} <b>${item.percent}%</b></span>`).join(''):'<span>No repeated weak MCQ topic yet</span>';
    panel.innerHTML=`<div><small>Recent exam readiness · ${summary.attempts} attempt${summary.attempts===1?'':'s'}</small><div class="ff-v7-readiness-score"><strong>${summary.readiness}%</strong><span>${esc(summary.label)}</span></div></div><div class="ff-v7-readiness-focus"><small>Focus next</small><div>${weak}</div></div><button class="btn" type="button" data-v7-start-quick>Start focused recall</button>`;
    const anchor=$('.ff-v5-action-grid',hub);if(anchor)anchor.insertAdjacentElement('beforebegin',panel);else hub.prepend(panel);
    $('[data-v7-start-quick]',panel)?.addEventListener('click',()=>{
      const quick=$('[data-start-mode="quick"]','#practiceWorkbench');
      if(quick)quick.click();else $('[data-start-mode="generated"]','#practiceWorkbench')?.click();
    });
  }

  function queueCenter(){[0,70,180,360].forEach(delay=>setTimeout(renderCenterInsight,delay))}

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('[data-exam-submit],[data-exam-finish],[data-results-close],[data-results-retry],[data-practice-module],[data-exam-exit]');
    if(!target)return;
    if(target.matches('[data-exam-submit],[data-exam-finish]')){
      const snapshot=readActive();if(snapshot)queueDecorate(snapshot,false);
      return;
    }
    if(target.matches('[data-results-close],[data-results-retry],[data-practice-module],[data-exam-exit]'))queueCenter();
  },true);

  addEventListener('finalforge-exam-time-expired',()=>{const snapshot=readActive();if(snapshot)queueDecorate(snapshot,true)});
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='practice')queueCenter()});
  addEventListener('finalforge-practice-v5-ready',queueCenter);
  addEventListener('finalforge-ready',queueCenter,{once:true});

  const originalRender=window.renderPractice;
  if(typeof originalRender==='function'&&!originalRender.__ffReviewV7){
    const wrapped=function(...args){const result=originalRender.apply(this,args);queueCenter();return result};
    wrapped.__ffReviewV7=true;window.renderPractice=wrapped;
  }

  window.FinalForgePracticeReview={buildInsight,renderCenterInsight};
  queueCenter();
})();