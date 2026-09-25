/* FinalForge Practice v4 — self-contained generated papers and exam runner. */
(() => {
  'use strict';
  const DATA = window.FINALFORGE_DATA || window.EXAMHUB_DATA || {};
  const BANK = window.EXAMHUB_PRACTICE || {};
  const modules = DATA.modules || {};
  const ACTIVE_KEY = 'finalforge_exam_v4_active';
  const HISTORY_KEY = 'finalforge_exam_v4_history';
  const SCORE_KEY = 'finalforge_quiz_scores';
  let selected = 'dcn';
  let exam = null;
  let timer = 0;

  const $ = s => document.querySelector(s);
  const esc = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const notify = msg => typeof window.toast === 'function' ? window.toast(msg) : console.info(msg);
  const hash = text => { let h=2166136261>>>0; for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0; };
  const random = seed => () => { seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const sample = (items, count, seedText) => { const copy=[...(items||[])], rng=random(hash(seedText)); for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]} return copy.slice(0,Math.min(count,copy.length)); };
  const fmtTime = seconds => { seconds=Math.max(0,seconds|0); return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':'); };
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

  function item(raw, kind, section, marks){
    return {id:uid(),kind,section,marks,q:raw.q,o:raw.o||[],a:raw.a,e:raw.e||'',p:raw.p||[],s:raw.s||''};
  }

  function buildPaper(mod, mode='mock', variant=1){
    const b=BANK[mod], m=modules[mod];
    if(!b || !m) return null;
    const seed=`finalforge-${mod}-${mode}-${variant}-${mode==='generated'?Date.now():2026}`;
    let questions=[];
    if(mode==='quick'){
      questions=sample(b.mcq,10,seed).map(q=>item(q,'mcq','Quick Quiz',1));
    }else if(mod==='dcn'){
      questions=[
        ...sample(b.mcq,10,seed+'a').map(q=>item(q,'mcq','Section A · MCQ',2)),
        ...sample(b.structured,4,seed+'b').map(q=>item(q,'written','Section B · Structured',7.5)),
        ...sample(b.essays,10,seed+'c').map(q=>item(q,'written','Section C · Essay',5))
      ];
    }else if(mod==='ip'){
      questions=[
        ...sample(b.mcq,25,seed+'a').map(q=>item(q,'mcq','Section A · Auto-marked',2)),
        ...sample(b.code,2,seed+'b').map(q=>item(q,'code','Section B · Java programs',25))
      ];
    }else if(mod==='mc'){
      questions=[
        ...sample(b.q1,1,seed+'1').map(q=>item(q,'written','Question 1 · Logic Control',25)),
        ...sample(b.q2,1,seed+'2').map(q=>item(q,'written','Question 2 · Algebra and Trigonometry',25)),
        ...sample(b.q3,1,seed+'3').map(q=>item(q,'written','Question 3 · Calculus',25)),
        ...sample(b.q4,1,seed+'4').map(q=>item(q,'written','Question 4 · Matrices',25))
      ];
    }else{
      questions=sample(b.essays,4,seed).map(q=>item(q,'written','Essay paper',25));
    }
    const minutes=mode==='quick'?20:120;
    return {
      version:4,id:uid(),module:mod,mode,variant,title:mode==='quick'?`${m.short} 10-question quiz`:`${m.short} Mock Paper ${mode==='generated'?'· Generated':variant}`,
      createdAt:Date.now(),endAt:Date.now()+minutes*60000,duration:minutes*60,current:0,answers:{},flags:{},finished:false,questions
    };
  }

  function saveExam(){ if(exam && !exam.finished){exam.savedAt=Date.now();write(ACTIVE_KEY,exam);} }
  function activeExam(){ const saved=read(ACTIVE_KEY,null); return saved?.version===4 && !saved.finished ? saved : null; }
  function answerValue(q){ return exam?.answers?.[q.id]; }
  function answered(q){ const value=answerValue(q); return q.kind==='mcq' ? value!==undefined && value!==null : Boolean(String(value||'').trim()); }
  function answeredCount(){ return exam ? exam.questions.filter(answered).length : 0; }
  function stopTimer(){ if(timer){clearInterval(timer);timer=0;} }

  function renderPractice(){
    if(!$('#practiceModuleTabs')) return;
    stopTimer();
    const m=modules[selected], saved=activeExam();
    $('#practiceModuleTabs').innerHTML=Object.entries(modules).map(([key,value])=>`<button class="btn practice-tab ${key===selected?'active':''}" type="button" onclick="setPracticeMod('${key}')"><span>${esc(value.short)}</span><small>${esc(value.code)}</small></button>`).join('');
    const history=read(HISTORY_KEY,[]).filter(x=>x.module===selected);
    const scores=read(SCORE_KEY,{})[selected]||{};
    $('#practiceHero').innerHTML=`<div class="practice-identity"><img src="assets/finalforge-logo-256.webp" alt=""><div><div class="kicker">${esc(m.code)} · ${esc(m.name)}</div><h2>Exam practice center</h2><p class="muted">Generate a complete paper, answer one question at a time and return to an autosaved attempt on any screen size.</p></div></div><div class="practice-readiness"><strong>${scores.best||0}%</strong><span>Best auto-marked score</span></div>`;
    $('#practiceStats').innerHTML=`
      <article class="card stat"><span class="muted small">Question bank</span><strong>${bankCount(selected)}+</strong><span class="muted small">Source-based prompts</span></article>
      <article class="card stat"><span class="muted small">Completed</span><strong>${history.length}</strong><span class="muted small">Saved attempts</span></article>
      <article class="card stat"><span class="muted small">Best score</span><strong>${scores.best||'—'}${scores.best?'%':''}</strong><span class="muted small">Auto-marked questions</span></article>
      <article class="card stat"><span class="muted small">Exam mode</span><strong>2h</strong><span class="muted small">Timer and autosave</span></article>`;
    $('#practiceWorkbench').innerHTML=`<div class="practice-actions-grid">
      <article class="card practice-action"><span class="action-icon">10</span><div><div class="kicker">Fast recall</div><h3>10-question quick quiz</h3><p class="muted">Instant marking and clear explanations from the module bank.</p></div><button class="btn primary" onclick="startPracticeExam('quick')">Start quiz</button></article>
      <article class="card practice-action featured"><span class="action-icon">2h</span><div><div class="kicker">Full paper</div><h3>Generate a mock exam</h3><p class="muted">A fresh paper matching the published module structure, with timer and question navigator.</p></div><button class="btn primary" onclick="startPracticeExam('generated')">Generate paper</button></article>
      <article class="card practice-action"><span class="action-icon">01</span><div><div class="kicker">Repeatable version</div><h3>Mock Paper 1</h3><p class="muted">Use the same question mix again to measure improvement.</p></div><button class="btn" onclick="startPracticeExam('mock',1)">Start paper</button></article>
    </div>${saved?`<div class="resume-exam"><div><b>${esc(saved.title)}</b><span>${answeredSaved(saved)}/${saved.questions.length} answered · saved ${relative(saved.savedAt||saved.createdAt)}</span></div><div><button class="btn primary" onclick="resumePracticeExam()">Resume attempt</button><button class="btn" onclick="discardPracticeExam()">Discard</button></div></div>`:''}`;
    renderHistory();
    if($('#weaknessPanel')) $('#weaknessPanel').innerHTML='';
    if($('#refBuilder')) $('#refBuilder').innerHTML='';
    if($('#practiceGuide')) $('#practiceGuide').innerHTML='';
    window.finalforgeRefreshEffects?.();
  }

  function bankCount(mod){ const b=BANK[mod]||{}; return Object.values(b).filter(Array.isArray).reduce((sum,a)=>sum+a.filter(x=>x&&typeof x==='object'&&x.q).length,0); }
  function answeredSaved(st){ return st.questions.filter(q=>{const v=st.answers?.[q.id];return q.kind==='mcq'?v!==undefined&&v!==null:Boolean(String(v||'').trim())}).length; }
  function relative(at){ const min=Math.max(0,Math.round((Date.now()-at)/60000)); return min<1?'just now':min<60?`${min} min ago`:`${Math.round(min/60)} h ago`; }

  function renderHistory(){
    const host=$('#mockLibrary'); if(!host)return;
    const rows=read(HISTORY_KEY,[]).filter(x=>x.module===selected).slice(0,6);
    host.innerHTML=`<div class="section-head"><div><div class="kicker">Attempts</div><h2>Recent exam papers</h2><div class="muted">Results are saved on this device.</div></div></div><div class="attempt-list">${rows.length?rows.map(x=>`<article class="attempt-row"><img src="assets/finalforge-logo-256.webp" alt=""><div><b>${esc(x.title)}</b><span>${new Date(x.finishedAt).toLocaleString()} · ${x.answered}/${x.total} answered</span></div><strong>${x.mcqTotal?`${x.mcqCorrect}/${x.mcqTotal}`:'Reviewed'}</strong></article>`).join(''):'<div class="card empty-attempt"><b>No completed papers yet.</b><span>Generate a mock paper and your result will appear here.</span></div>'}</div>`;
  }

  function startPracticeExam(mode='mock', variant=1){
    const saved=activeExam();
    if(saved && !confirm('Start a new paper? Your current saved attempt will be replaced.')) return;
    exam=buildPaper(selected,mode,variant); if(!exam){notify('Question bank is unavailable');return;}
    saveExam(); renderExam();
  }

  function resumePracticeExam(){
    exam=activeExam(); if(!exam){notify('No saved attempt found');renderPractice();return;}
    selected=exam.module; renderExam();
  }

  function discardPracticeExam(){
    if(!confirm('Discard the saved attempt and its answers?')) return;
    localStorage.removeItem(ACTIVE_KEY); exam=null; renderPractice(); notify('Saved attempt discarded');
  }

  function renderExam(){
    stopTimer(); if(!exam)return;
    const host=$('#practiceWorkbench'), m=modules[exam.module], q=exam.questions[exam.current];
    $('#practiceHero').hidden=true; $('#practiceStats').hidden=true; $('#practiceModuleTabs').hidden=true;
    if($('#mockLibrary')) $('#mockLibrary').hidden=true;
    host.innerHTML=`<div class="exam-app">
      <header class="exam-top"><div class="exam-brand"><img src="assets/finalforge-logo-256.webp" alt="FinalForge"><div><b>FinalForge Exam</b><span>${esc(m.code)} · ${esc(exam.title)}</span></div></div><div class="exam-save"><i></i> Autosaved</div><button class="btn" onclick="exitPracticeExam()">Save & exit</button></header>
      <div class="exam-layout">
        <aside class="exam-rail"><div class="exam-clock-label">Time remaining</div><strong class="exam-clock" id="examClock">${fmtTime(Math.ceil((exam.endAt-Date.now())/1000))}</strong><div class="exam-progress"><i style="width:${Math.round(answeredCount()/exam.questions.length*100)}%"></i></div><span>${answeredCount()} of ${exam.questions.length} answered</span><div class="exam-section-label">Question navigator</div><div class="exam-nav">${exam.questions.map((x,i)=>`<button type="button" class="${i===exam.current?'current':''} ${answered(x)?'answered':''} ${exam.flags[x.id]?'flagged':''}" onclick="goPracticeQuestion(${i})" aria-label="Question ${i+1}">${i+1}</button>`).join('')}</div><div class="exam-legend"><span><i class="answered"></i>Answered</span><span><i class="flagged"></i>Review</span><span><i></i>Unanswered</span></div><button class="btn primary exam-submit" onclick="submitPracticeExam()">Submit final attempt</button></aside>
        <main class="exam-question" id="examQuestion">${questionHTML(q)}</main>
      </div>
    </div>`;
    bindQuestion(); updateTimer(); timer=setInterval(updateTimer,1000); window.scrollTo({top:0,behavior:'smooth'});
  }

  function questionHTML(q){
    const n=exam.current+1, value=answerValue(q);
    let input='';
    if(q.kind==='mcq') input=`<div class="exam-options">${q.o.map((o,i)=>`<label class="${Number(value)===i?'selected':''}"><input type="radio" name="exam-answer" value="${i}" ${Number(value)===i?'checked':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></label>`).join('')}</div>`;
    else input=`<label class="exam-answer-label" for="examWritten">${q.kind==='code'?'Your complete Java answer':'Your answer'}</label><textarea id="examWritten" class="exam-written ${q.kind==='code'?'code':''}" spellcheck="${q.kind==='code'?'false':'true'}" placeholder="${q.kind==='code'?'Write your Java solution here…':'Structure your answer clearly…'}">${esc(value||'')}</textarea><span class="exam-local-note">Saved automatically on this device</span>`;
    return `<div class="question-meta"><span>${esc(q.section)} · Question ${n} of ${exam.questions.length}</span><b>${q.marks} ${q.marks===1?'mark':'marks'}</b></div><h2>${esc(q.q)}</h2>${input}<div class="exam-question-actions"><button class="btn" onclick="goPracticeQuestion(${n-2})" ${n===1?'disabled':''}>Previous</button><button class="btn flag ${exam.flags[q.id]?'active':''}" onclick="togglePracticeFlag()">${exam.flags[q.id]?'Marked for review':'Mark for review'}</button>${n<exam.questions.length?`<button class="btn primary" onclick="goPracticeQuestion(${n})">Next</button>`:`<button class="btn primary" onclick="submitPracticeExam()">Finish paper</button>`}</div>`;
  }

  function bindQuestion(){
    const q=exam.questions[exam.current];
    document.querySelectorAll('input[name="exam-answer"]').forEach(input=>input.addEventListener('change',e=>{exam.answers[q.id]=Number(e.target.value);saveExam();renderExam();}));
    const area=$('#examWritten'); if(area) area.addEventListener('input',e=>{exam.answers[q.id]=e.target.value;saveExam();});
  }

  function goPracticeQuestion(index){
    if(!exam)return; const area=$('#examWritten'),q=exam.questions[exam.current];if(area)exam.answers[q.id]=area.value;
    exam.current=Math.max(0,Math.min(exam.questions.length-1,Number(index)||0));saveExam();renderExam();
  }
  function togglePracticeFlag(){ const q=exam.questions[exam.current]; exam.flags[q.id]=!exam.flags[q.id]; saveExam(); renderExam(); }
  function exitPracticeExam(){ saveExam(); stopTimer(); exam=null; restorePractice(); renderPractice(); }
  function restorePractice(){ $('#practiceHero').hidden=false;$('#practiceStats').hidden=false;$('#practiceModuleTabs').hidden=false;if($('#mockLibrary'))$('#mockLibrary').hidden=false; }
  function updateTimer(){
    if(!exam)return; const left=Math.ceil((exam.endAt-Date.now())/1000), el=$('#examClock');if(el)el.textContent=fmtTime(left);
    if(left<=0){stopTimer();finishPracticeExam(true);}
  }

  function submitPracticeExam(){
    const missing=exam.questions.length-answeredCount();
    if(!confirm(missing?`Submit with ${missing} unanswered question${missing===1?'':'s'}?`:'Submit your final attempt?'))return;
    finishPracticeExam(false);
  }

  function finishPracticeExam(auto){
    stopTimer(); if(!exam)return;
    let mcqTotal=0,mcqCorrect=0;
    exam.questions.forEach(q=>{if(q.kind==='mcq'){mcqTotal++;if(Number(exam.answers[q.id])===q.a)mcqCorrect++;}});
    exam.finished=true;exam.finishedAt=Date.now();
    const row={module:exam.module,title:exam.title,finishedAt:exam.finishedAt,answered:answeredCount(),total:exam.questions.length,mcqCorrect,mcqTotal};
    write(HISTORY_KEY,[row,...read(HISTORY_KEY,[])].slice(0,30));
    if(mcqTotal){const pct=Math.round(mcqCorrect/mcqTotal*100),scores=read(SCORE_KEY,{});scores[exam.module]={last:pct,best:Math.max(pct,scores[exam.module]?.best||0),total:mcqTotal};write(SCORE_KEY,scores);}
    localStorage.removeItem(ACTIVE_KEY); renderResults(auto,mcqCorrect,mcqTotal);
  }

  function renderResults(auto,correct,total){
    const host=$('#practiceWorkbench');
    host.innerHTML=`<div class="exam-results"><div class="result-hero"><img src="assets/finalforge-logo-256.webp" alt=""><div><div class="kicker">${auto?'Time finished':'Attempt submitted'}</div><h2>${esc(exam.title)}</h2><p>${answeredCount()} of ${exam.questions.length} questions answered${total?` · ${correct} of ${total} auto-marked answers correct`:''}.</p></div>${total?`<strong>${Math.round(correct/total*100)}%</strong>`:''}</div><div class="result-review">${exam.questions.map((q,i)=>reviewHTML(q,i)).join('')}</div><div class="exam-result-actions"><button class="btn primary" onclick="closePracticeResults()">Back to practice center</button><button class="btn" onclick="retryPracticeExam()">Try another paper</button></div></div>`;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function reviewHTML(q,i){
    const value=exam.answers[q.id], ok=q.kind==='mcq'&&Number(value)===q.a;
    const answer=q.kind==='mcq'?`<div class="review-answer ${ok?'correct':'incorrect'}"><b>${ok?'Correct':'Review this answer'}</b><span>Your answer: ${value===undefined?'Not answered':esc(q.o[value])}</span><span>Correct answer: ${esc(q.o[q.a])}</span>${q.e?`<p>${esc(q.e)}</p>`:''}</div>`:`<div class="review-answer written"><b>Self-mark guide</b><span>Your answer is saved above.</span>${q.p.length?`<ul>${q.p.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:'<p>Compare your response with the source material and check each required step.</p>'}</div>`;
    return `<article><div class="question-meta"><span>${i+1} · ${esc(q.section)}</span><b>${q.marks} marks</b></div><h3>${esc(q.q)}</h3>${answer}${q.s?`<small>Source: ${esc(q.s)}</small>`:''}</article>`;
  }
  function closePracticeResults(){ exam=null;restorePractice();renderPractice(); }
  function retryPracticeExam(){ const mode=exam?.mode||'generated',variant=exam?.variant||1;exam=null;restorePractice();startPracticeExam(mode,variant); }
  function setPracticeMod(mod){ if(!modules[mod])return;selected=mod;renderPractice(); }

  Object.assign(window,{renderPractice,setPracticeMod,startPracticeExam,resumePracticeExam,discardPracticeExam,goPracticeQuestion,togglePracticeFlag,exitPracticeExam,submitPracticeExam,closePracticeResults,retryPracticeExam});
  window.FinalForgePractice={buildPaper};
})();
