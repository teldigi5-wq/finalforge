/* FinalForge Practice v5 — reliable question navigation, multi-paper library and opt-in Java compiler. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PRACTICE_V5)return;
  window.FINALFORGE_PRACTICE_V5=Object.freeze({version:'5.0.0',mode:'exam-studio'});

  const DATA=window.FINALFORGE_DATA||window.EXAMHUB_DATA||{};
  const BANK=window.EXAMHUB_PRACTICE||{};
  const modules=DATA.modules||{};
  const ACTIVE_KEY='finalforge_exam_v4_active';
  const HISTORY_KEY='finalforge_exam_v4_history';
  const SCORE_KEY='finalforge_quiz_scores';
  const OC_ORIGINS=new Set(['https://onecompiler.com','https://sandbox.onecompiler.com']);
  let selected='dcn';
  let exam=null;
  let timer=0;
  let saveDelay=0;
  let activeCompilerFrame=null;
  let activeCompilerQuestionId='';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const notify=msg=>typeof window.toast==='function'?window.toast(msg):console.info(msg);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const hash=text=>{let h=2166136261>>>0;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const sample=(items,count,seedText)=>{const copy=[...(items||[])],r=rng(hash(seedText));for(let i=copy.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy.slice(0,Math.min(count,copy.length))};
  const shuffle=(items,seedText)=>sample(items,items.length,seedText);
  const fmtTime=seconds=>{seconds=Math.max(0,seconds|0);return[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':')};
  const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  function item(raw,kind,section,marks){
    return {
      id:uid(),kind,section,marks,q:raw?.q||'',o:raw?.o||[],a:raw?.a,e:raw?.e||'',p:raw?.p||[],s:raw?.s||'',
      snippet:raw?.snippet||'',topic:raw?.topic||'',coverage:Number(raw?.coverage)||0,starter:raw?.starter||'',pattern:raw?.pattern||''
    };
  }

  function balancedIpMcq(bank,seed){
    const all=[...(bank?.mcq||[])];
    const tagged=all.filter(q=>q&&q.coverage>=1&&q.coverage<=10);
    const chosen=[];
    const used=new Set();
    for(let slot=1;slot<=10;slot++){
      const pool=tagged.filter(q=>q.coverage===slot);
      for(const q of sample(pool,2,`${seed}-coverage-${slot}`)){chosen.push(q);used.add(q)}
    }
    const fill=all.filter(q=>!used.has(q));
    chosen.push(...sample(fill,Math.max(0,25-chosen.length),`${seed}-fill`));
    return shuffle(chosen.slice(0,25),`${seed}-shuffle`);
  }

  function ipCodePair(bank,variant,seed){
    const model=(bank?.code||[]).filter(q=>q?.model2026||q?.starter||q?.pattern);
    if(model.length<2)return sample(bank?.code||[],2,seed);
    const patterns=[['parallel','matrix'],['methods','parallel'],['matrix','methods'],['parallel','methods']];
    const pair=patterns[(Math.max(1,Number(variant)||1)-1)%patterns.length];
    const out=[];
    pair.forEach((pattern,index)=>{
      const pool=model.filter(q=>q.pattern===pattern&&!out.includes(q));
      const pick=sample(pool,1,`${seed}-${pattern}-${index}`)[0];
      if(pick)out.push(pick);
    });
    if(out.length<2)out.push(...sample(model.filter(q=>!out.includes(q)),2-out.length,`${seed}-rest`));
    return out.slice(0,2);
  }

  function buildPaper(mod,mode='mock',variant=1){
    const b=BANK[mod],m=modules[mod];
    if(!b||!m)return null;
    const fixed=mode==='generated'?Date.now():2026;
    const seed=`finalforge-v5-${mod}-${mode}-${variant}-${fixed}`;
    let questions=[];
    let title='';

    if(mode==='quick'){
      const quick=sample(b.mcq||[],10,seed).map(q=>item(q,'mcq','Quick Quiz',1));
      if(!quick.length)return null;
      questions=quick;
      title=`${m.short||mod.toUpperCase()} · 10-question quick quiz`;
    }else if(mod==='ip'){
      let mcqSource=b,codeSource=b;
      if(mode==='hard'&&window.FINALFORGE_IP_HARD_BANK){mcqSource=window.FINALFORGE_IP_HARD_BANK;codeSource=window.FINALFORGE_IP_HARD_BANK}
      if(mode==='challenge'&&window.FINALFORGE_IP_CHALLENGE_BANK){mcqSource=window.FINALFORGE_IP_CHALLENGE_BANK;codeSource=window.FINALFORGE_IP_CHALLENGE_BANK}
      const mcqs=(mode==='hard'||mode==='challenge'?sample(mcqSource.mcq||[],25,`${seed}-mcq`):balancedIpMcq(b,`${seed}-mcq`));
      let codes;
      if(mode==='hard'||mode==='challenge')codes=sample(codeSource.code||[],2,`${seed}-code`);
      else codes=ipCodePair(b,variant,`${seed}-code`);
      questions=[...mcqs.map(q=>item(q,'mcq','Part 1 · MCQ',2)),...codes.map(q=>item(q,'code','Part 2 · Java programs',25))];
      title=mode==='hard'?`IP Hard Paper ${variant}`:mode==='challenge'?`IP Challenge Paper ${variant}`:mode==='generated'?'IP Generated Model Paper':`IP Model Paper ${variant}`;
    }else if(mod==='dcn'){
      questions=[
        ...sample(b.mcq||[],10,`${seed}-a`).map(q=>item(q,'mcq','Section A · MCQ',2)),
        ...sample(b.structured||[],4,`${seed}-b`).map(q=>item(q,'written','Section B · Structured',7.5)),
        ...sample(b.essays||[],10,`${seed}-c`).map(q=>item(q,'written','Section C · Essay',5))
      ];
      title=mode==='generated'?'DCN Generated Model Paper':`DCN Model Paper ${variant}`;
    }else if(mod==='mc'){
      questions=[
        ...sample(b.q1||[],1,`${seed}-1`).map(q=>item(q,'written','Question 1 · Logic Control',25)),
        ...sample(b.q2||[],1,`${seed}-2`).map(q=>item(q,'written','Question 2 · Algebra and Trigonometry',25)),
        ...sample(b.q3||[],1,`${seed}-3`).map(q=>item(q,'written','Question 3 · Calculus',25)),
        ...sample(b.q4||[],1,`${seed}-4`).map(q=>item(q,'written','Question 4 · Matrices',25))
      ];
      title=mode==='generated'?'MC Generated Model Paper':`MC Model Paper ${variant}`;
    }else{
      questions=sample(b.essays||[],4,seed).map(q=>item(q,'written','Essay paper',25));
      title=mode==='generated'?`${m.short||'FC'} Generated Model Paper`:`${m.short||'FC'} Model Paper ${variant}`;
    }

    if(!questions.length)return null;
    const minutes=mode==='quick'?20:120;
    return {version:5,id:uid(),module:mod,mode,variant,title,createdAt:Date.now(),endAt:Date.now()+minutes*60000,duration:minutes*60,current:0,answers:{},flags:{},finished:false,questions};
  }

  function activeExam(){
    const saved=read(ACTIVE_KEY,null);
    if(!saved||saved.finished||![4,5].includes(saved.version))return null;
    if(saved.version===4)saved.version=5;
    return saved;
  }
  function saveExam(){if(exam&&!exam.finished){exam.savedAt=Date.now();write(ACTIVE_KEY,exam);paintSaveState('Saved')}}
  function scheduleSave(){clearTimeout(saveDelay);paintSaveState('Saving…');saveDelay=setTimeout(saveExam,180)}
  function answerValue(q){return exam?.answers?.[q.id]}
  function answered(q){const value=answerValue(q);return q?.kind==='mcq'?value!==undefined&&value!==null:Boolean(String(value||'').trim())}
  function answeredCount(){return exam?exam.questions.filter(answered).length:0}
  function stopTimer(){if(timer){clearInterval(timer);timer=0}}
  function closeCompiler(){activeCompilerFrame=null;activeCompilerQuestionId=''}
  function bankCount(mod){const b=BANK[mod]||{};return Object.values(b).filter(Array.isArray).reduce((sum,a)=>sum+a.filter(x=>x&&typeof x==='object'&&x.q).length,0)}
  function relative(at){const min=Math.max(0,Math.round((Date.now()-at)/60000));return min<1?'just now':min<60?`${min} min ago`:`${Math.round(min/60)} h ago`}

  function modulePattern(mod){
    if(mod==='ip')return {eyebrow:'Verified 2026 final structure',title:'25 MCQs + 2 Java programs',detail:'2 hours exam · 10-minute source upload window · Lectures 1–10',accent:'Java + NetExam'};
    if(mod==='dcn')return {eyebrow:'Current FinalForge model',title:'10 MCQ + 4 structured + 10 essay',detail:'Full-paper simulator with written-answer autosave',accent:'Networks'};
    if(mod==='mc')return {eyebrow:'Current FinalForge model',title:'4 structured questions',detail:'Logic · algebra/trigonometry · calculus · matrices',accent:'Mathematics'};
    return {eyebrow:'Current FinalForge model',title:'4 essay questions',detail:'Full-paper writing practice with review guides',accent:'Computing'};
  }

  function renderPractice(){
    if(!$('#practiceModuleTabs'))return;
    stopTimer();closeCompiler();
    const m=modules[selected]||Object.values(modules)[0];
    if(!m)return;
    const b=BANK[selected]||{},saved=activeExam(),history=read(HISTORY_KEY,[]).filter(x=>x.module===selected),scores=read(SCORE_KEY,{})[selected]||{},pattern=modulePattern(selected);

    $('#practiceModuleTabs').hidden=false;
    $('#practiceModuleTabs').innerHTML=Object.entries(modules).map(([key,value])=>`<button class="btn practice-tab ${key===selected?'active':''}" type="button" data-practice-module="${esc(key)}"><span>${esc(value.short||key.toUpperCase())}</span><small>${esc(value.code||'')}</small></button>`).join('');
    $('#practiceModuleTabs').querySelectorAll('[data-practice-module]').forEach(button=>button.addEventListener('click',()=>setPracticeMod(button.dataset.practiceModule)));

    const hero=$('#practiceHero');
    hero.hidden=false;
    hero.innerHTML=`<div class="ff-v5-practice-hero-copy"><div class="kicker">${esc(m.code||'')} · ${esc(m.name||'')}</div><h2>Exam Studio</h2><p class="muted">Train with repeatable model papers, autosaved answers and focused review — without the page jumping when you answer.</p><div class="ff-v5-hero-pills"><span>${esc(pattern.accent)}</span><span>Autosave</span><span>4 model papers</span></div></div><div class="ff-v5-pattern-card"><small>${esc(pattern.eyebrow)}</small><strong>${esc(pattern.title)}</strong><span>${esc(pattern.detail)}</span></div>`;

    const stats=$('#practiceStats');
    stats.hidden=false;
    stats.innerHTML=`
      <article class="card stat"><span class="muted small">Question bank</span><strong>${bankCount(selected)}+</strong><span class="muted small">Practice prompts</span></article>
      <article class="card stat"><span class="muted small">Completed</span><strong>${history.length}</strong><span class="muted small">Saved attempts</span></article>
      <article class="card stat"><span class="muted small">Best score</span><strong>${scores.best||'—'}${scores.best?'%':''}</strong><span class="muted small">Auto-marked questions</span></article>
      <article class="card stat"><span class="muted small">Full paper</span><strong>2h</strong><span class="muted small">Timer + autosave</span></article>`;

    const quickAvailable=Array.isArray(b.mcq)&&b.mcq.length>=10;
    const modelCards=[1,2,3,4].map(n=>`<article class="card ff-v5-paper-card"><div class="ff-v5-paper-index">0${n}</div><div><small>Repeatable model</small><h3>Model Paper ${n}</h3><p>Deterministic question mix so you can retry and measure improvement.</p></div><button class="btn" type="button" data-start-mode="mock" data-variant="${n}">Start paper</button></article>`).join('');
    const ipExtras=selected==='ip'?`<div class="ff-v5-special-row"><article class="card"><div><small>Higher difficulty</small><b>IP Hard Paper</b><span>Arrays, 2D arrays, methods and validation.</span></div><button class="btn" type="button" data-start-mode="hard" data-variant="1">Start hard paper</button></article><article class="card"><div><small>Challenge mode</small><b>IP Challenge Paper</b><span>Extra reasoning around the same first-year patterns.</span></div><button class="btn" type="button" data-start-mode="challenge" data-variant="1">Start challenge</button></article></div>`:'';
    const ipNotice=selected==='ip'?`<div class="ff-v5-source-note"><b>IP final model basis</b><span>Official structure: 25 MCQs (50%) + 2 Java programs (50%), Lectures 1–10. Code-tracing questions use original FinalForge examples. The online compiler below is practice-only; the real final does not allow Internet access.</span></div>`:'';

    $('#practiceWorkbench').innerHTML=`<div class="ff-v5-practice-hub">
      <div class="ff-v5-action-grid">
        ${quickAvailable?`<article class="card ff-v5-action-card"><div class="ff-v5-action-orb">10</div><div><small>Fast recall</small><h3>Quick Quiz</h3><p>Ten auto-marked questions with explanations.</p></div><button class="btn primary" type="button" data-start-mode="quick" data-variant="1">Start quiz</button></article>`:''}
        <article class="card ff-v5-action-card featured"><div class="ff-v5-action-orb">∞</div><div><small>Fresh every time</small><h3>Generate a model paper</h3><p>A new full-paper mix using the current module structure.</p></div><button class="btn primary" type="button" data-start-mode="generated" data-variant="1">Generate paper</button></article>
      </div>
      <div class="ff-v5-library-head"><div><div class="kicker">Model paper library</div><h3>Four repeatable full papers</h3></div><span>${esc(pattern.title)}</span></div>
      <div class="ff-v5-paper-grid">${modelCards}</div>
      ${ipExtras}
      ${saved?`<div class="ff-v5-resume"><div><small>Saved attempt</small><b>${esc(saved.title)}</b><span>${saved.questions?.filter(q=>{const v=saved.answers?.[q.id];return q.kind==='mcq'?v!==undefined&&v!==null:Boolean(String(v||'').trim())}).length||0}/${saved.questions?.length||0} answered · ${relative(saved.savedAt||saved.createdAt)}</span></div><div><button class="btn primary" type="button" data-resume-exam>Resume</button><button class="btn" type="button" data-discard-exam>Discard</button></div></div>`:''}
      <section class="ff-v5-how"><div class="ff-v5-library-head"><div><div class="kicker">How to use Exam Studio</div><h3>Pick → attempt → review</h3></div></div><div class="ff-v5-how-grid"><article><span>01</span><b>Choose a module</b><p>Use the tabs above to match the subject you are revising.</p></article><article><span>02</span><b>Sit the paper</b><p>Answers autosave. Question controls stay visible and never jump you to the top after a choice.</p></article><article><span>03</span><b>Review weak areas</b><p>Submit to see MCQ explanations and self-marking points for written/code tasks.</p></article></div></section>
      <section class="ff-v5-tools"><button type="button" data-go-tool="resources"><span>⌁</span><b>Resource Library</b><small>Return to notes and labs</small></button><button type="button" data-go-tool="planner"><span>⚡</span><b>Study Planner</b><small>Prioritise the next exam</small></button><button type="button" data-go-tool="analytics"><span>⌁</span><b>Analytics</b><small>See attempts and progress</small></button></section>
      ${ipNotice}
    </div>`;

    $$('[data-start-mode]','#practiceWorkbench').forEach(button=>button.addEventListener('click',()=>startPracticeExam(button.dataset.startMode,Number(button.dataset.variant)||1)));
    $('[data-resume-exam]','#practiceWorkbench')?.addEventListener('click',resumePracticeExam);
    $('[data-discard-exam]','#practiceWorkbench')?.addEventListener('click',discardPracticeExam);
    $$('[data-go-tool]','#practiceWorkbench').forEach(button=>button.addEventListener('click',()=>window.go?.(button.dataset.goTool)));
    renderHistory();
    if($('#weaknessPanel'))$('#weaknessPanel').innerHTML='';
    if($('#refBuilder'))$('#refBuilder').innerHTML='';
    if($('#practiceGuide'))$('#practiceGuide').innerHTML='';
    window.finalforgeRefreshEffects?.();
  }

  function renderHistory(){
    const host=$('#mockLibrary');if(!host)return;host.hidden=false;
    const rows=read(HISTORY_KEY,[]).filter(x=>x.module===selected).slice(0,6);
    host.innerHTML=`<div class="section-head ff-v5-history-head"><div><div class="kicker">Attempts</div><h2>Recent model papers</h2><div class="muted">Review your last six completed attempts on this device.</div></div></div><div class="attempt-list">${rows.length?rows.map(x=>`<article class="attempt-row"><img src="assets/finalforge-logo-256.webp" alt=""><div><b>${esc(x.title)}</b><span>${new Date(x.finishedAt).toLocaleString()} · ${x.answered}/${x.total} answered</span></div><strong>${x.mcqTotal?`${x.mcqCorrect}/${x.mcqTotal}`:'Reviewed'}</strong></article>`).join(''):'<div class="card empty-attempt"><b>No completed papers yet.</b><span>Start a model paper and your result will appear here.</span></div>'}</div>`;
  }

  function startPracticeExam(mode='mock',variant=1){
    const saved=activeExam();
    if(saved&&!confirm('Start a new paper? Your current saved attempt will be replaced.'))return;
    exam=buildPaper(selected,mode,variant);
    if(!exam){notify('This practice mode is not available for the selected module.');return}
    write(ACTIVE_KEY,exam);renderExam();
  }
  function resumePracticeExam(){exam=activeExam();if(!exam){notify('No saved attempt found');renderPractice();return}selected=exam.module;renderExam()}
  function discardPracticeExam(){if(!confirm('Discard the saved attempt and its answers?'))return;localStorage.removeItem(ACTIVE_KEY);exam=null;renderPractice();notify('Saved attempt discarded')}

  function hidePracticeChrome(){
    if($('#practiceHero'))$('#practiceHero').hidden=true;
    if($('#practiceStats'))$('#practiceStats').hidden=true;
    if($('#practiceModuleTabs'))$('#practiceModuleTabs').hidden=true;
    if($('#mockLibrary'))$('#mockLibrary').hidden=true;
  }
  function restorePractice(){
    if($('#practiceHero'))$('#practiceHero').hidden=false;
    if($('#practiceStats'))$('#practiceStats').hidden=false;
    if($('#practiceModuleTabs'))$('#practiceModuleTabs').hidden=false;
    if($('#mockLibrary'))$('#mockLibrary').hidden=false;
  }

  function renderExam(){
    stopTimer();closeCompiler();if(!exam)return;
    hidePracticeChrome();
    const host=$('#practiceWorkbench'),m=modules[exam.module]||{};
    host.innerHTML=`<div class="exam-app ff-v5-exam-app">
      <header class="exam-top ff-v5-exam-top"><div class="exam-brand"><img src="assets/finalforge-logo-256.webp" alt="FinalForge"><div><b>FinalForge Exam Studio</b><span>${esc(m.code||'')} · ${esc(exam.title)}</span></div></div><div class="exam-save" id="ffExamSave"><i></i><span>Saved</span></div><button class="btn" type="button" data-exam-exit>Save & exit</button></header>
      <div class="exam-layout ff-v5-exam-layout">
        <aside class="exam-rail ff-v5-exam-rail"><div class="exam-clock-label">Time remaining</div><strong class="exam-clock" id="examClock">${fmtTime(Math.ceil((exam.endAt-Date.now())/1000))}</strong><div class="exam-progress"><i id="ffExamProgress"></i></div><span id="ffExamProgressText"></span><div class="exam-section-label">Question navigator</div><div class="exam-nav" id="ffExamNav"></div><div class="exam-legend"><span><i class="answered"></i>Answered</span><span><i class="flagged"></i>Review</span><span><i></i>Unanswered</span></div><button class="btn primary exam-submit" type="button" data-exam-submit>Submit final attempt</button></aside>
        <main class="exam-question ff-v5-exam-question" id="examQuestion" tabindex="-1"></main>
      </div>
    </div>`;
    $('[data-exam-exit]',host)?.addEventListener('click',exitPracticeExam);
    $('[data-exam-submit]',host)?.addEventListener('click',submitPracticeExam);
    renderNavigator();renderQuestion(false);updateRail();updateTimer();
    timer=setInterval(updateTimer,1000);
  }

  function renderNavigator(){
    const nav=$('#ffExamNav');if(!nav||!exam)return;
    nav.innerHTML=exam.questions.map((q,i)=>`<button type="button" data-question-index="${i}" aria-label="Question ${i+1}">${i+1}</button>`).join('');
    $$('[data-question-index]',nav).forEach(button=>button.addEventListener('click',()=>goPracticeQuestion(Number(button.dataset.questionIndex))));
  }

  function snippetHTML(q){return q.snippet?`<div class="ff-v5-code-trace"><div><span>Java code</span><small>Trace this before choosing</small></div><pre><code>${esc(q.snippet)}</code></pre></div>`:''}
  function codeInputHTML(q,value){
    return `<div class="ff-v5-code-workspace"><div class="ff-v5-code-head"><div><span>Java answer</span><small>Your code autosaves locally</small></div><button class="btn" type="button" data-compiler-open>Open practice compiler</button></div><textarea id="examWritten" class="exam-written code ff-v5-native-code" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Write your complete Java solution here…">${esc(value||q.starter||'')}</textarea><div class="ff-v5-compiler-note"><b>Practice compiler only.</b> The real IP final has no Internet access; students compile locally with Command Prompt. Do not enter personal information in the external compiler.</div><div class="ff-v5-compiler-mount" id="ffCompilerMount" hidden></div></div>`;
  }

  function renderQuestion(shouldScroll=true){
    if(!exam)return;
    closeCompiler();
    const host=$('#examQuestion'),q=exam.questions[exam.current];if(!host||!q)return;
    const n=exam.current+1,value=answerValue(q);
    let input='';
    if(q.kind==='mcq'){
      input=`<div class="exam-options ff-v5-options">${q.o.map((o,i)=>`<label class="${Number(value)===i?'selected':''}"><input type="radio" name="exam-answer" value="${i}" ${Number(value)===i?'checked':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></label>`).join('')}</div>`;
    }else if(q.kind==='code')input=codeInputHTML(q,value);
    else input=`<label class="exam-answer-label" for="examWritten">Your answer</label><textarea id="examWritten" class="exam-written" spellcheck="true" placeholder="Structure your answer clearly…">${esc(value||'')}</textarea><span class="exam-local-note">Saved automatically on this device</span>`;

    host.innerHTML=`<div class="question-meta"><span>${esc(q.section)} · Question ${n} of ${exam.questions.length}${q.topic?` · ${esc(q.topic)}`:''}</span><b>${q.marks} ${q.marks===1?'mark':'marks'}</b></div><h2>${esc(q.q)}</h2>${snippetHTML(q)}${input}<div class="exam-question-actions ff-v5-sticky-actions"><button class="btn" type="button" data-exam-prev ${n===1?'disabled':''}>Previous</button><button class="btn flag ${exam.flags[q.id]?'active':''}" type="button" data-exam-flag>${exam.flags[q.id]?'Marked for review':'Mark for review'}</button>${n<exam.questions.length?`<button class="btn primary" type="button" data-exam-next>Next question</button>`:`<button class="btn primary" type="button" data-exam-finish>Finish paper</button>`}</div>`;

    $$('input[name="exam-answer"]',host).forEach(input=>input.addEventListener('change',event=>{
      exam.answers[q.id]=Number(event.target.value);
      $$('.ff-v5-options label',host).forEach(label=>label.classList.toggle('selected',label.contains(event.target)));
      scheduleSave();updateRail();
    }));
    const area=$('#examWritten');
    if(area){
      if(q.kind==='code'&&answerValue(q)===undefined&&q.starter){exam.answers[q.id]=q.starter;scheduleSave()}
      area.addEventListener('input',event=>{exam.answers[q.id]=event.target.value;scheduleSave()});
    }
    $('[data-exam-prev]',host)?.addEventListener('click',()=>goPracticeQuestion(exam.current-1));
    $('[data-exam-next]',host)?.addEventListener('click',()=>goPracticeQuestion(exam.current+1));
    $('[data-exam-finish]',host)?.addEventListener('click',submitPracticeExam);
    $('[data-exam-flag]',host)?.addEventListener('click',togglePracticeFlag);
    $('[data-compiler-open]',host)?.addEventListener('click',()=>openCompiler(q));
    updateRail();
    if(shouldScroll)requestAnimationFrame(()=>host.scrollIntoView({behavior:'smooth',block:'start'}));
    else requestAnimationFrame(()=>host.focus({preventScroll:true}));
  }

  function paintSaveState(text){const node=$('#ffExamSave span');if(node)node.textContent=text}
  function updateRail(){
    if(!exam)return;
    const done=answeredCount(),total=exam.questions.length,pct=total?Math.round(done/total*100):0;
    const bar=$('#ffExamProgress'),text=$('#ffExamProgressText');if(bar)bar.style.width=`${pct}%`;if(text)text.textContent=`${done} of ${total} answered · ${pct}%`;
    $$('[data-question-index]','#ffExamNav').forEach(button=>{
      const i=Number(button.dataset.questionIndex),q=exam.questions[i];
      button.classList.toggle('current',i===exam.current);button.classList.toggle('answered',answered(q));button.classList.toggle('flagged',Boolean(exam.flags[q.id]));
      if(i===exam.current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
  }

  function saveCurrentInput(){const area=$('#examWritten'),q=exam?.questions?.[exam.current];if(area&&q)exam.answers[q.id]=area.value}
  function goPracticeQuestion(index){
    if(!exam)return;
    saveCurrentInput();saveExam();
    const target=clamp(Number(index)||0,0,exam.questions.length-1);
    if(target===exam.current){updateRail();return}
    exam.current=target;saveExam();renderQuestion(true);
  }
  function togglePracticeFlag(){if(!exam)return;const q=exam.questions[exam.current];exam.flags[q.id]=!exam.flags[q.id];saveExam();const button=$('[data-exam-flag]');if(button){button.classList.toggle('active',exam.flags[q.id]);button.textContent=exam.flags[q.id]?'Marked for review':'Mark for review'}updateRail()}
  function exitPracticeExam(){saveCurrentInput();saveExam();stopTimer();closeCompiler();exam=null;restorePractice();renderPractice()}
  function updateTimer(){if(!exam)return;const left=Math.ceil((exam.endAt-Date.now())/1000),el=$('#examClock');if(el)el.textContent=fmtTime(left);if(left<=0){stopTimer();finishPracticeExam(true)}}

  function openCompiler(q){
    const mount=$('#ffCompilerMount');if(!mount||!q||q.kind!=='code')return;
    mount.hidden=false;
    if(activeCompilerFrame&&activeCompilerQuestionId===q.id){activeCompilerFrame.scrollIntoView({behavior:'smooth',block:'nearest'});return}
    const controls=document.createElement('div');controls.className='ff-v5-compiler-controls';controls.innerHTML='<div><b>Java practice compiler</b><span>Powered by OneCompiler · external service</span></div><div><button class="btn" type="button" data-compiler-sync>Sync answer</button><button class="btn primary" type="button" data-compiler-run>Run code</button></div>';
    const frame=document.createElement('iframe');
    frame.className='ff-v5-compiler-frame';frame.title='Java practice compiler';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.src='https://onecompiler.com/embed/java?hideLanguageSelection=true&hideNew=true&hideNewFileOption=true&hideTitle=true&disableAutoComplete=true&theme=dark&fontSize=15&listenToEvents=true&codeChangeEvent=true';
    mount.replaceChildren(controls,frame);activeCompilerFrame=frame;activeCompilerQuestionId=q.id;
    const sync=()=>populateCompiler(q);
    $('[data-compiler-sync]',controls)?.addEventListener('click',sync);
    $('[data-compiler-run]',controls)?.addEventListener('click',()=>{populateCompiler(q);setTimeout(()=>frame.contentWindow?.postMessage({eventType:'triggerRun'},'https://onecompiler.com'),80)});
    frame.addEventListener('load',()=>setTimeout(sync,120),{once:true});
  }

  function populateCompiler(q){
    if(!activeCompilerFrame||activeCompilerQuestionId!==q.id)return;
    saveCurrentInput();
    const code=String(exam?.answers?.[q.id]||q.starter||'');
    activeCompilerFrame.contentWindow?.postMessage({eventType:'populateCode',language:'java',files:[{name:'Main.java',content:code}]},'https://onecompiler.com');
  }

  addEventListener('message',event=>{
    if(!activeCompilerFrame||event.source!==activeCompilerFrame.contentWindow||!OC_ORIGINS.has(event.origin))return;
    const data=event.data;if(!data||String(data.language||'').toLowerCase()!=='java')return;
    const files=Array.isArray(data.files)?data.files:[];
    const main=files.find(file=>/\.java$/i.test(String(file?.name||'')))||files[0];
    if(!main||typeof main.content!=='string'||!exam||activeCompilerQuestionId!==exam.questions[exam.current]?.id)return;
    exam.answers[activeCompilerQuestionId]=main.content;
    const area=$('#examWritten');if(area&&area.value!==main.content)area.value=main.content;
    scheduleSave();updateRail();
  });

  function submitPracticeExam(){
    if(!exam)return;saveCurrentInput();saveExam();
    const missing=exam.questions.length-answeredCount();
    if(!confirm(missing?`Submit with ${missing} unanswered question${missing===1?'':'s'}?`:'Submit your final attempt?'))return;
    finishPracticeExam(false);
  }

  function finishPracticeExam(auto){
    stopTimer();closeCompiler();if(!exam)return;saveCurrentInput();
    let mcqTotal=0,mcqCorrect=0;
    exam.questions.forEach(q=>{if(q.kind==='mcq'){mcqTotal++;if(Number(exam.answers[q.id])===q.a)mcqCorrect++}});
    exam.finished=true;exam.finishedAt=Date.now();
    const row={module:exam.module,title:exam.title,finishedAt:exam.finishedAt,answered:answeredCount(),total:exam.questions.length,mcqCorrect,mcqTotal};
    write(HISTORY_KEY,[row,...read(HISTORY_KEY,[])].slice(0,30));
    if(mcqTotal){const pct=Math.round(mcqCorrect/mcqTotal*100),scores=read(SCORE_KEY,{});scores[exam.module]={last:pct,best:Math.max(pct,scores[exam.module]?.best||0),total:mcqTotal};write(SCORE_KEY,scores)}
    localStorage.removeItem(ACTIVE_KEY);renderResults(auto,mcqCorrect,mcqTotal);
  }

  function reviewHTML(q,i){
    const value=exam.answers[q.id],ok=q.kind==='mcq'&&Number(value)===q.a;
    let answer='';
    if(q.kind==='mcq')answer=`<div class="review-answer ${ok?'correct':'incorrect'}"><b>${ok?'Correct':'Review this answer'}</b><span>Your answer: ${value===undefined?'Not answered':esc(q.o[value])}</span><span>Correct answer: ${esc(q.o[q.a])}</span>${q.e?`<p>${esc(q.e)}</p>`:''}</div>`;
    else if(q.kind==='code')answer=`<div class="review-answer written"><b>Self-mark guide</b>${q.p?.length?`<ul>${q.p.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`:'<p>Compare each requirement with your solution.</p>'}${value?`<details><summary>Your submitted Java answer</summary><pre class="ff-v5-review-code"><code>${esc(value)}</code></pre></details>`:''}</div>`;
    else answer=`<div class="review-answer written"><b>Self-mark guide</b>${q.p?.length?`<ul>${q.p.map(point=>`<li>${esc(point)}</li>`).join('')}</ul>`:'<p>Compare your response with the source material and check every required step.</p>'}</div>`;
    return `<article><div class="question-meta"><span>${i+1} · ${esc(q.section)}</span><b>${q.marks} marks</b></div><h3>${esc(q.q)}</h3>${snippetHTML(q)}${answer}${q.s?`<small>Source: ${esc(q.s)}</small>`:''}</article>`;
  }

  function renderResults(auto,correct,total){
    const host=$('#practiceWorkbench');
    host.innerHTML=`<div class="exam-results ff-v5-results"><div class="result-hero"><img src="assets/finalforge-logo-256.webp" alt=""><div><div class="kicker">${auto?'Time finished':'Attempt submitted'}</div><h2>${esc(exam.title)}</h2><p>${answeredCount()} of ${exam.questions.length} questions answered${total?` · ${correct} of ${total} auto-marked answers correct`:''}.</p></div>${total?`<strong>${Math.round(correct/total*100)}%</strong>`:''}</div><div class="result-review">${exam.questions.map((q,i)=>reviewHTML(q,i)).join('')}</div><div class="exam-result-actions"><button class="btn primary" type="button" data-results-close>Back to practice center</button><button class="btn" type="button" data-results-retry>Try another paper</button></div></div>`;
    $('[data-results-close]',host)?.addEventListener('click',closePracticeResults);
    $('[data-results-retry]',host)?.addEventListener('click',retryPracticeExam);
    host.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closePracticeResults(){exam=null;restorePractice();renderPractice()}
  function retryPracticeExam(){const mode=exam?.mode||'generated',variant=exam?.variant||1;exam=null;restorePractice();startPracticeExam(mode,variant)}
  function setPracticeMod(mod){if(!modules[mod])return;selected=mod;renderPractice()}

  document.addEventListener('keydown',event=>{
    if(!exam||event.defaultPrevented)return;
    const target=event.target;if(target&&/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
    if(event.altKey&&event.key==='ArrowRight'){event.preventDefault();goPracticeQuestion(exam.current+1)}
    if(event.altKey&&event.key==='ArrowLeft'){event.preventDefault();goPracticeQuestion(exam.current-1)}
  });

  Object.assign(window,{renderPractice,setPracticeMod,startPracticeExam,resumePracticeExam,discardPracticeExam,goPracticeQuestion,togglePracticeFlag,exitPracticeExam,submitPracticeExam,closePracticeResults,retryPracticeExam});
  window.FinalForgePractice={buildPaper};
})();