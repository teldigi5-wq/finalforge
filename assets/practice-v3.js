/* FinalForge V3 — Mock Paper Studio + weak-area insights */
(() => {
  const baseRenderPractice = renderPractice;
  const baseSubmitQuiz = submitQuiz;
  const ACTIVE_KEY = 'finalforge_active_mock_v3';
  const HISTORY_KEY = 'finalforge_mock_history_v3';
  const WEAK_KEY = 'finalforge_weakness_v3';

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hashSeed = str => { let h=2166136261>>>0; for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const seededSample = (arr,n,seedText) => { const a=[...arr],r=rng(hashSeed(seedText)); for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a.slice(0,Math.min(n,a.length)); };
  const questionCount = st => st?.sections?.reduce((sum,s)=>sum+s.items.length,0)||0;
  const history = () => JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
  const saveHistory = row => { const h=history(); h.unshift(row); localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,16))); };
  const weakness = () => JSON.parse(localStorage.getItem(WEAK_KEY)||'{}');

  function recordQuizInsights(){
    if(!quizState?.items?.length) return;
    const all=weakness(); all[practiceMod] ??= {};
    quizState.items.forEach((x,i)=>{
      const pick=document.querySelector(`input[name=q${i}]:checked`), v=pick?Number(pick.value):-1, key=x.s||'Unknown topic';
      all[practiceMod][key] ??= {attempts:0,wrong:0}; all[practiceMod][key].attempts++;
      if(v!==x.a) all[practiceMod][key].wrong++;
    });
    localStorage.setItem(WEAK_KEY,JSON.stringify(all));
  }

  submitQuiz = function(){
    if(!quizState||quizState.submitted) return;
    recordQuizInsights();
    baseSubmitQuiz();
    renderWeakness();
  };

  function seededConfig(mod,paperNo){
    const d=P[mod], seed=`FinalForge-2026-${mod}-paper-${paperNo}`;
    if(mod==='dcn')return {title:`DCN Mock Paper ${paperNo}`,sections:[
      {name:'Part A — 10 MCQs (20 marks)',kind:'mcq',items:seededSample(d.mcq,10,seed+'-a')},
      {name:'Part B — 4 Structured Short Answers (30 marks)',kind:'written',items:seededSample(d.structured,4,seed+'-b')},
      {name:'Part C — 10 Essay-Type Questions (50 marks)',kind:'written',items:seededSample(d.essays,10,seed+'-c')}]};
    if(mod==='ip')return {title:`IP Mock Paper ${paperNo}`,sections:[
      {name:'Part 1 — 25 MCQs (50%)',kind:'mcq',items:seededSample(d.mcq,25,seed+'-a')},
      {name:'Part 2 — 2 Java Programs (50%)',kind:'code',items:seededSample(d.code,2,seed+'-b')}]};
    if(mod==='mc')return {title:`MC Mock Paper ${paperNo}`,sections:[
      {name:'Question 1 — Logic Control',kind:'written',items:seededSample(d.q1,1,seed+'-1')},
      {name:'Question 2 — Partial Fractions / Trigonometry / Complex Numbers',kind:'written',items:seededSample(d.q2,1,seed+'-2')},
      {name:'Question 3 — Differentiation / Integration',kind:'written',items:seededSample(d.q3,1,seed+'-3')},
      {name:'Question 4 — Matrices',kind:'written',items:seededSample(d.q4,1,seed+'-4')}]};
    return {title:`FC Mock Paper ${paperNo}`,sections:[{name:'Four Essay-Type Questions',kind:'written',items:seededSample(d.essays,4,seed+'-a')}]};
  }

  function buildState(paper='random'){
    const cfg = paper==='random' ? mockConfig(practiceMod) : seededConfig(practiceMod,paper);
    return {...cfg,module:practiceMod,paperId:paper,paperLabel:paper==='random'?'Random Paper':`Paper ${paper}`,generatedAt:Date.now(),end:Date.now()+120*60*1000,finished:false,answers:{},selections:{},historySaved:false};
  }
  function saveActive(){ if(mockState&&!mockState.finished)localStorage.setItem(ACTIVE_KEY,JSON.stringify(mockState)); }
  function clearActive(){ localStorage.removeItem(ACTIVE_KEY); }
  function activeMock(){ try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch{return null} }

  startMock = function(paper='random'){
    stopMock(); mockState=buildState(paper); saveActive(); renderMock(); mockTick=setInterval(()=>{updateMockTimer();saveActive()},1000); updateMockTimer();
    window.logStudyActivity?.('mock-start');
  };

  window.resumeActiveMock = function(){
    const st=activeMock(); if(!st){toast('No saved mock to resume');return} if(st.end<=Date.now()){localStorage.removeItem(ACTIVE_KEY);toast('Saved mock has expired');renderMockLibrary();return}
    practiceMod=st.module; mockState=st; renderPractice(); renderMock(); stopMock(); mockTick=setInterval(()=>{updateMockTimer();saveActive()},1000); updateMockTimer();
  };

  window.startPresetMock = p => startMock(p);
  window.startRandomMock = () => startMock('random');

  renderMock = function(){
    if(!mockState) return;
    let html=`<div class="card mock-shell immersive-mock"><div class="mock-header"><div><div class="kicker">${modules[practiceMod].code} • ${esc(mockState.paperLabel)} • 2-hour simulator</div><h2>${esc(mockState.title)}</h2><div class="muted">${mockRules(practiceMod)}</div><div class="autosave-badge">● Autosaving answers • cloud sync when signed in</div></div><div><div class="mock-timer" id="mockTimer">02:00:00</div><div class="mock-progress"><i id="mockProgressBar"></i></div><div class="muted small" id="mockProgressText">0/${questionCount(mockState)} answered</div></div></div><div class="mock-tools"><button class="btn" onclick="printCurrentMock()">🖨️ Print / Save PDF</button><button class="btn" onclick="saveActive();toast('Mock saved on this device')">💾 Save</button></div>`;
    let n=1;
    for(const sec of mockState.sections){
      html+=`<div class="mock-section"><h3>${esc(sec.name)}</h3>`;
      for(const item of sec.items){
        const idx=n-1;
        if(sec.kind==='mcq'){
          html+=`<article class="mock-q"><b>${n}. ${esc(item.q)}</b><div class="quiz-options">${item.o.map((o,j)=>`<label><input type="radio" name="mq${idx}" data-mq="${idx}" value="${j}" ${Number(mockState.selections?.[idx])===j?'checked':''}> <span>${esc(o)}</span></label>`).join('')}<div class="model-answer" id="ma${idx}"><b>Answer: ${esc(item.o[item.a])}</b><br>${esc(item.e)}<div class="source-tag">${esc(item.s)}</div></div></div></article>`;
        }else{
          const val=mockState.answers?.[idx]||'';
          html+=`<article class="mock-q"><b>${n}. ${esc(item.q)}</b><textarea class="mock-answer" data-ma="${idx}" placeholder="Write your practice answer here…">${esc(val)}</textarea><div class="model-answer"><b>Self-marking points</b><ul>${(item.p||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul><div class="source-tag">Source: ${esc(item.s)}</div></div></article>`;
        }
        n++;
      }
      html+='</div>';
    }
    html+=`<div class="exam-actions"><button class="btn primary" onclick="finishMock()">Finish & reveal guide</button><button class="btn" onclick="startMock(mockState.paperId)">Restart this paper</button><button class="btn" onclick="renderPracticeStart();stopMock();saveActive()">Exit mock</button></div></div>`;
    $('#practiceWorkbench').innerHTML=html;
    $$('[data-mq]').forEach(el=>el.addEventListener('change',e=>{mockState.selections[e.target.dataset.mq]=Number(e.target.value);saveActive();updateCompletion()}));
    $$('[data-ma]').forEach(el=>el.addEventListener('input',e=>{mockState.answers[e.target.dataset.ma]=e.target.value;saveActive();updateCompletion()}));
    updateCompletion(); scrollTo({top:0,behavior:'smooth'}); window.finalforgeRefreshEffects?.();
  };

  function updateCompletion(){
    if(!mockState)return; let done=0,total=questionCount(mockState),idx=0;
    for(const sec of mockState.sections){for(const item of sec.items){if(sec.kind==='mcq'){if(mockState.selections?.[idx]!=null)done++}else if((mockState.answers?.[idx]||'').trim())done++;idx++}}
    const p=total?Math.round(done/total*100):0; const bar=$('#mockProgressBar'),txt=$('#mockProgressText'); if(bar)bar.style.width=p+'%';if(txt)txt.textContent=`${done}/${total} answered • ${p}%`;
  }

  finishMock = function(auto=false){
    if(!mockState)return; stopMock(); mockState.finished=true;
    let mcqTotal=0,mcqCorrect=0,idx=0;
    for(const sec of mockState.sections){for(const item of sec.items){if(sec.kind==='mcq'){mcqTotal++;if(Number(mockState.selections?.[idx])===item.a)mcqCorrect++}idx++}}
    $$('.model-answer').forEach(x=>x.classList.add('show'));$$('.mock-answer').forEach(x=>x.disabled=true);$$('.mock-q input').forEach(x=>x.disabled=true);
    const shell=$('.mock-shell');
    if(shell&&!shell.querySelector('.mock-finish-banner')) shell.insertAdjacentHTML('afterbegin',`<div class="notice mock-finish-banner"><strong>${auto?'Time is up.':'Mock finished.'}</strong><div class="muted">${mcqTotal?`MCQ score: <b>${mcqCorrect}/${mcqTotal}</b>. `:''}Use the revealed marking points to self-mark written answers.</div><div class="exam-actions"><button class="btn" onclick="printCurrentMock()">Print question paper</button><button class="btn" onclick="printMarkingGuide()">Print marking guide</button></div></div>`);
    if(!mockState.historySaved){saveHistory({module:practiceMod,paperLabel:mockState.paperLabel,title:mockState.title,at:Date.now(),mcqCorrect,mcqTotal});mockState.historySaved=true}
    clearActive(); renderMockLibrary(); window.logStudyActivity?.('mock-finish');
  };

  window.saveActive = saveActive;

  function printPaperState(st,guide=false){
    const m=modules[st.module||practiceMod],w=window.open('','_blank');if(!w){toast('Allow pop-ups to print the paper');return}
    let qno=1,body='';
    for(const sec of st.sections){body+=`<section><h2>${esc(sec.name)}</h2>`;for(const item of sec.items){body+=`<div class="q"><b>${qno}. ${esc(item.q)}</b>`;if(item.o&&!guide)body+=`<ol type="A">${item.o.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`;if(guide){if(item.o)body+=`<div class="answer"><b>Answer:</b> ${esc(item.o[item.a])}<br>${esc(item.e||'')}<br><small>${esc(item.s||'')}</small></div>`;else body+=`<div class="answer"><b>Marking points</b><ul>${(item.p||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul><small>${esc(item.s||'')}</small></div>`}else if(!item.o)body+=`<div class="lines"></div>`;body+='</div>';qno++}body+='</section>'}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(st.title)}${guide?' Marking Guide':''}</title><style>@page{size:A4;margin:14mm}body{font:12px/1.45 Arial;color:#111;margin:0}header{border-bottom:2px solid #111;padding-bottom:9px;margin-bottom:14px}.row{display:flex;justify-content:space-between;gap:20px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 8px;border-bottom:1px solid #777;padding-bottom:4px}.q{margin:0 0 15px;break-inside:avoid}.q ol{margin:6px 0 0}.lines{height:70px;margin-top:8px;background:repeating-linear-gradient(to bottom,transparent 0 19px,#ddd 20px)}.answer{margin-top:7px;padding:8px;border:1px solid #aaa;background:#f7f7f7}.answer ul{margin:5px 0;padding-left:18px}.meta{font-size:11px;color:#444}.student{margin-top:9px;border:1px solid #999;padding:6px}.warn{margin-top:7px;font-weight:bold}</style></head><body><header><div class="row"><div><h1>${esc(m.code)} — ${esc(m.name)}</h1><div>${esc(st.title)}${guide?' • Marking Guide':''}</div></div><div><b>FinalForge</b><br>Practice Paper</div></div>${guide?'':`<div class="student">Name: ______________________________ &nbsp;&nbsp; Student ID: ____________________</div>`}<div class="warn">${esc(mockRules(st.module||practiceMod))}</div><div class="meta">Unofficial practice material generated from the course-source question bank in FinalForge. Verify official exam notices separately.</div></header>${body}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  }

  window.printCurrentMock = () => { if(mockState) printPaperState(mockState,false); };
  window.printMarkingGuide = () => { if(mockState) printPaperState(mockState,true); };
  window.printPresetPaper = p => printPaperState({...seededConfig(practiceMod,p),module:practiceMod,paperLabel:`Paper ${p}`},false);

  window.discardActiveMock = () => {stopMock();mockState=null;clearActive();renderPracticeStart();renderMockLibrary();toast('Saved mock cleared. Start again when ready.');};
  window.clearMockHistory = () => {localStorage.removeItem(HISTORY_KEY);renderMockLibrary();toast('Mock history cleared')};
  window.clearWeakness = () => {const a=weakness();delete a[practiceMod];localStorage.setItem(WEAK_KEY,JSON.stringify(a));renderWeakness();toast('Weak-area insights cleared')};

  window.renderMockLibrary = function(){
    const el=$('#mockLibrary');if(!el)return;const m=modules[practiceMod],active=activeMock(),h=history().filter(x=>x.module===practiceMod).slice(0,5);
    const preset=[1,2,3].map(p=>`<article class="card paper-card"><div class="kicker">${m.code} • Preset</div><div class="paper-no">0${p}</div><h3>Mock Paper ${p}</h3><div class="paper-meta"><span class="chip">2 hours</span><span class="chip">${practiceMod==='ip'?'MCQ + Java':practiceMod==='dcn'?'3 sections':practiceMod==='mc'?'4 structured Qs':'4 essays'}</span></div><div class="muted small">Stable paper: students can attempt the same version and compare afterward.</div><div class="exam-actions"><button class="btn primary" onclick="startPresetMock(${p})">Start timed</button><button class="btn" onclick="printPresetPaper(${p})">Print blank</button></div></article>`).join('');
    el.innerHTML=`<div class="section-head"><div><div class="kicker">V3 mock paper studio</div><h2>${m.short} Mock Paper Library</h2><div class="muted">Three repeatable papers plus unlimited random variants.</div></div><div class="exam-actions"><a class="btn" href="mock-papers/index.html" target="_blank">📚 Printable paper pack ↗</a>${active&&active.module===practiceMod&&active.end>Date.now()?'<button class="btn primary" onclick="resumeActiveMock()">▶ Resume saved mock</button><button class="btn" onclick="discardActiveMock()">🗑 Clear saved answers & restart</button>':''}</div></div><div class="mock-library-grid">${preset}<article class="card paper-card"><div class="kicker">${m.code} • Generator</div><div class="paper-no">∞</div><h3>Random Paper</h3><div class="paper-meta"><span class="chip">New mix</span><span class="chip">2 hours</span></div><div class="muted small">Generate a fresh source-based question combination whenever you need another attempt.</div><button class="btn primary" onclick="startRandomMock()">Generate & start</button></article></div><div class="section-head" style="margin-top:18px"><div><h3>Recent attempts</h3><div class="muted small">Stored only in this browser.</div></div>${h.length?'<button class="btn" onclick="clearMockHistory()">Clear history</button>':''}</div><div class="paper-history">${h.length?h.map(x=>`<div class="history-row"><div><b>${esc(x.title)}</b><div class="muted small">${new Date(x.at).toLocaleString()}${x.mcqTotal?` • MCQ ${x.mcqCorrect}/${x.mcqTotal}`:''}</div></div><span class="chip">Completed</span><button class="btn" onclick="startMock('${x.paperLabel==='Random Paper'?'random':x.paperLabel.replace('Paper ','')}')">Retry</button></div>`).join(''):'<div class="paper-preview"><b>No completed mocks yet.</b><div class="muted small">Start with Paper 1 under exam conditions, then use a random paper for a second attempt.</div></div>'}</div>`;
    window.finalforgeRefreshEffects?.();
  };

  window.renderWeakness = function(){
    const el=$('#weaknessPanel');if(!el)return;const data=weakness()[practiceMod]||{},rows=Object.entries(data).map(([k,v])=>({k,...v,rate:v.attempts?Math.round(v.wrong/v.attempts*100):0})).sort((a,b)=>b.wrong-a.wrong||b.rate-a.rate).slice(0,6);
    const strong=Object.entries(data).map(([k,v])=>({k,...v,rate:v.attempts?Math.round((v.attempts-v.wrong)/v.attempts*100):0})).filter(x=>x.attempts>=2).sort((a,b)=>b.rate-a.rate).slice(0,3);
    el.innerHTML=`<div class="section-head"><div><div class="kicker">Local learning analytics</div><h2>Weak-area insights</h2><div class="muted">Built from your quiz attempts — no account or upload required.</div></div>${rows.length?'<button class="btn" onclick="clearWeakness()">Reset insights</button>':''}</div><div class="weak-grid"><article class="card weak-card"><h3>Revise next</h3><div class="weak-list">${rows.length?rows.map(x=>`<div class="weak-row"><div><b>${esc(x.k)}</b><div class="muted small">${x.wrong} wrong from ${x.attempts} attempt${x.attempts===1?'':'s'}</div></div><span class="chip">${x.rate}% miss</span></div>`).join(''):'<div class="muted">Complete a quick quiz and your weak topics will appear here.</div>'}</div></article><article class="card weak-card"><h3>Strongest recalled areas</h3><div class="weak-list">${strong.length?strong.map(x=>`<div class="weak-row"><div><b style="color:#9be7cb">${esc(x.k)}</b><div class="muted small">${x.rate}% correct across attempts</div></div><span class="chip">Strong</span></div>`).join(''):'<div class="muted">More quiz attempts are needed before a reliable strength signal appears.</div>'}</div></article></div>`;
    window.finalforgeRefreshEffects?.();
  };

  renderPractice = function(){
    baseRenderPractice(); renderMockLibrary(); renderWeakness(); window.logStudyActivity?.('practice-view');
  };
})();
