/* FinalForge Student Experience v2 — practical command center + global search. */
(() => {
  'use strict';

  const DATA = window.FINALFORGE_DATA || window.EXAMHUB_DATA || {};
  const modules = DATA.modules || {};
  const resources = DATA.resources || [];
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };

  const sectionCommands = [
    ['home','Home','Dashboard, countdown and progress','⌂'],
    ['modules','Modules','Syllabus, lessons and completion','▦'],
    ['resources','Resources','Lecture slides, tutorials and practicals','⌕'],
    ['past-papers','Past Papers','Curated SLIIT exam archive','□'],
    ['practice','Practice','Quizzes and full mock exams','◎'],
    ['schedule','Schedule','Official exam timetable','◷'],
    ['planner','Planner','Urgency-first study plan','✓'],
    ['roadmap','Roadmap','Platform build roadmap','◇']
  ];

  function progress(){ return read('finalforge_progress',{}); }
  function modulePct(key){
    const m=modules[key], p=progress()[key]||{};
    if(!m?.lessons?.length) return 0;
    return Math.round(m.lessons.filter((_,i)=>p[i]).length/m.lessons.length*100);
  }
  function examDate(m){ return new Date(m?.date||0); }
  function orderedModules(){ return Object.entries(modules).sort((a,b)=>examDate(a[1])-examDate(b[1])); }
  function nextModuleEntry(){
    const now=Date.now();
    return orderedModules().find(([,m])=>examDate(m).getTime()>now) || orderedModules().at(-1) || [null,null];
  }
  function nextIncomplete(){
    const p=progress();
    for(const [key,m] of orderedModules()){
      const index=(m.lessons||[]).findIndex((_,i)=>!p[key]?.[i]);
      if(index>=0) return {key,m,index,lesson:m.lessons[index]};
    }
    return null;
  }
  function timeLeft(m){
    const ms=examDate(m).getTime()-Date.now();
    if(ms<=0) return {text:'Exam completed',cls:'',days:0};
    const days=Math.floor(ms/86400000), hours=Math.floor(ms%86400000/3600000);
    return {text:days?`${days}d ${hours}h left`:`${hours}h left`,cls:days<1?'urgent':days<3?'soon':'',days};
  }
  function activeExam(){
    const saved=read('finalforge_exam_v4_active',null);
    return saved && !saved.finished ? saved : null;
  }

  function personalizeTopbar(){
    const first=$('.topbar>div:first-child'); if(!first)return;
    const hour=new Date().getHours();
    const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
    const raw=($('#accountPrimary')?.textContent||'Student').trim();
    const name=/student|sign in/i.test(raw)?'Student':raw.split(/\s+/)[0];
    const kicker=first.querySelector('.kicker');
    const sub=first.querySelector('.muted');
    const [,m]=nextModuleEntry();
    if(kicker) kicker.textContent=`${greeting}, ${name}`;
    if(sub&&m){ const left=timeLeft(m); sub.textContent=`Next: ${m.short||m.code} · ${left.text}`; }
  }

  function installSearchTrigger(){
    const bar=$('.topbar'); if(!bar||bar.querySelector('.ff-v2-search-trigger'))return;
    const wrap=bar.querySelector('.top-account-wrap');
    const btn=document.createElement('button');
    btn.className='ff-v2-search-trigger'; btn.type='button'; btn.setAttribute('aria-label','Search FinalForge');
    btn.innerHTML='<span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span>Search FinalForge</span></span><kbd>Ctrl K</kbd>';
    btn.addEventListener('click',openPalette);
    wrap?bar.insertBefore(btn,wrap):bar.appendChild(btn);
  }

  function installCommandCenter(){
    const home=$('#home'), dock=home?.querySelector('.quick-dock');
    if(!home||!dock||home.querySelector('.ff-v2-command-center'))return;
    const next=nextIncomplete();
    const [nextKey,nextMod]=nextModuleEntry();
    const left=nextMod?timeLeft(nextMod):{text:'No upcoming exam',cls:''};
    const pct=next?modulePct(next.key):100;
    const exam=activeExam();
    const answered=exam?Object.keys(exam.answers||{}).length:0;
    const card=document.createElement('section');
    card.className='ff-v2-command-center';
    card.innerHTML=`
      <div class="ff-v2-command-head"><div><div class="kicker">Student command center</div><h2>What matters next</h2></div><div class="muted small">Continue from your real progress instead of hunting through menus.</div></div>
      <div class="ff-v2-command-grid">
        <article class="card ff-v2-study-card">
          <div class="ff-v2-card-top"><div class="ff-v2-card-icon">↗</div><div class="ff-v2-progress-ring" style="--p:${pct}"><b>${pct}%</b></div></div>
          <div class="ff-v2-card-label">Continue studying</div>
          <h3>${next?`${esc(next.m.short||next.m.code)} · ${esc(next.lesson?.[1]||next.lesson?.[0]||'Next lesson')}`:'All lesson blocks completed'}</h3>
          <p>${next?esc((next.lesson?.[2]||[]).slice(0,3).join(' · ')):'Use a timed mock paper to reinforce what you finished.'}</p>
          <div class="ff-v2-card-actions"><button class="btn primary" type="button" data-ff-v2-action="continue">${next?'Open lesson':'Open practice'}</button></div>
        </article>
        <article class="card ff-v2-study-card">
          <div class="ff-v2-card-top"><div class="ff-v2-card-icon">◷</div><span class="ff-v2-urgency ${left.cls}">${esc(left.text)}</span></div>
          <div class="ff-v2-card-label">Next exam</div>
          <h3>${nextMod?`${esc(nextMod.short||nextMod.code)} · ${esc(nextMod.name||'')}`:'Schedule complete'}</h3>
          <p>${nextMod?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Colombo'}).format(examDate(nextMod)):'Check the official timetable for updates.'}</p>
          <div class="ff-v2-card-actions"><button class="btn" type="button" onclick="go('schedule')">View schedule</button><button class="btn" type="button" onclick="go('planner')">Study plan</button></div>
        </article>
        <article class="card ff-v2-study-card">
          <div class="ff-v2-card-top"><div class="ff-v2-card-icon">◎</div><span class="ff-v2-urgency">${exam?`${answered}/${exam.questions?.length||0} answered`:'2h exam mode'}</span></div>
          <div class="ff-v2-card-label">Exam practice</div>
          <h3>${exam?esc(exam.title||'Resume your mock exam'):'Start a timed mock exam'}</h3>
          <p>${exam?'Your attempt is autosaved on this device. Continue where you stopped.':'Use the full timer, question navigator and review flow.'}</p>
          <div class="ff-v2-card-actions"><button class="btn primary" type="button" data-ff-v2-action="exam">${exam?'Resume attempt':'Open practice'}</button></div>
        </article>
        <article class="card ff-v2-study-card">
          <div class="ff-v2-card-top"><div class="ff-v2-card-icon">□</div><span class="ff-v2-urgency">DCN · IP · MC · FC</span></div>
          <div class="ff-v2-card-label">Past papers</div>
          <h3>Real exam-history archive</h3>
          <p>Current-code sources first, useful legacy papers clearly labelled second.</p>
          <div class="ff-v2-card-actions"><button class="btn primary" type="button" onclick="go('past-papers')">Browse papers</button><button class="btn" type="button" onclick="window.finalforgeOpenSearch?.('past papers')">Search</button></div>
        </article>
      </div>`;
    dock.after(card);
    card.querySelector('[data-ff-v2-action="continue"]')?.addEventListener('click',()=>{
      if(!next){ window.go?.('practice'); return; }
      window.go?.('modules'); setTimeout(()=>window.openModule?.(next.key),90);
    });
    card.querySelector('[data-ff-v2-action="exam"]')?.addEventListener('click',()=>{
      window.go?.('practice');
      if(exam) setTimeout(()=>window.resumePracticeExam?.(),80);
    });
  }

  function improveQuickDock(){
    const dock=$('#home .quick-dock'); if(!dock)return;
    const buttons=[...dock.querySelectorAll('button')];
    const last=buttons.at(-1); if(!last)return;
    last.setAttribute('onclick',"go('past-papers')");
    last.innerHTML='<span>📄</span><b>Past papers</b><small>Exam archive</small>';
  }

  function improveSidebar(){
    const cards=$$('.sidebar .side-card'); if(!cards.length)return;
    const [,m]=nextModuleEntry(); if(!m)return;
    const left=timeLeft(m);
    cards[0].innerHTML=`<b>${esc(m.short||m.code)} is next.</b><br><span class="muted small">${esc(left.text)} · ${modulePct(Object.keys(modules).find(k=>modules[k]===m)||'')}% syllabus marked complete.</span>`;
  }

  function ensurePalette(){
    if($('#ffV2Palette'))return;
    const el=document.createElement('div');
    el.id='ffV2Palette'; el.className='ff-v2-palette'; el.hidden=true;
    el.innerHTML=`<div class="ff-v2-palette-shell" role="dialog" aria-modal="true" aria-label="Search FinalForge">
      <div class="ff-v2-palette-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="ffV2SearchInput" autocomplete="off" placeholder="Search modules, resources, papers and actions…"><kbd>Esc</kbd></div>
      <div class="ff-v2-results" id="ffV2Results" role="listbox"></div>
      <div class="ff-v2-palette-foot"><span>↑↓ Navigate</span><span>Enter Open</span><span>Ctrl/⌘ K Search</span></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('mousedown',e=>{if(e.target===el)closePalette()});
    $('#ffV2SearchInput')?.addEventListener('input',()=>renderResults($('#ffV2SearchInput').value));
    $('#ffV2SearchInput')?.addEventListener('keydown',onPaletteKeydown);
  }

  function allCommands(){
    const commands=[];
    sectionCommands.forEach(([id,title,desc,icon])=>{
      if(document.getElementById(id)) commands.push({type:'Section',title,desc,icon,keywords:`${title} ${desc}`,run:()=>window.go?.(id)});
    });
    Object.entries(modules).forEach(([key,m])=>commands.push({type:'Module',title:`${m.short||m.code} · ${m.name}`,desc:`${m.code} · ${(m.lessons||[]).length} lesson blocks`,icon:'▦',keywords:`${m.short} ${m.code} ${m.name} ${(m.lessons||[]).flat(2).join(' ')}`,run:()=>{window.go?.('modules');setTimeout(()=>window.openModule?.(key),80)}}));
    resources.filter(r=>r&&r.title&&r.path).forEach(r=>commands.push({type:r.type||'Resource',title:r.title,desc:`${String(r.module||'').toUpperCase()} · ${r.ext?.toUpperCase()||'FILE'}`,icon:'⌕',keywords:`${r.title} ${r.module} ${r.type} ${r.ext}`,run:()=>window.open(encodeURI(r.path),'_blank','noopener')}));
    commands.push({type:'Action',title:'Resume current mock exam',desc:'Open your autosaved exam attempt',icon:'◎',keywords:'resume mock exam autosave attempt',run:()=>{window.go?.('practice');setTimeout(()=>window.resumePracticeExam?.(),80)}});
    commands.push({type:'Action',title:'Open official timetable',desc:'View the uploaded SLIIT exam timetable',icon:'◷',keywords:'official timetable exam pdf schedule',run:()=>window.open('official/Y1S1_Final_Exam_Timetable_V3_15-09-2026.pdf','_blank','noopener')});
    return commands;
  }
  function score(cmd,q){
    const hay=`${cmd.title} ${cmd.desc} ${cmd.keywords}`.toLowerCase();
    if(!q)return cmd.type==='Section'?4:1;
    if(cmd.title.toLowerCase().startsWith(q))return 12;
    if(cmd.title.toLowerCase().includes(q))return 8;
    return q.split(/\s+/).reduce((s,t)=>s+(hay.includes(t)?2:0),0);
  }
  function renderResults(value=''){
    const root=$('#ffV2Results'); if(!root)return;
    const q=String(value).trim().toLowerCase();
    const rows=allCommands().map(cmd=>({cmd,s:score(cmd,q)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,18);
    root.innerHTML=rows.length?rows.map(({cmd},i)=>`<button class="ff-v2-result ${i===0?'active':''}" type="button" role="option" data-ff-v2-index="${i}"><span class="ff-v2-result-icon">${esc(cmd.icon)}</span><span class="ff-v2-result-copy"><b>${esc(cmd.title)}</b><small>${esc(cmd.desc)}</small></span><span class="ff-v2-result-type">${esc(cmd.type)}</span></button>`).join(''):'<div class="ff-v2-empty">No matching FinalForge item. Try a module code, lecture title or “past papers”.</div>';
    root.querySelectorAll('.ff-v2-result').forEach((button,i)=>button.addEventListener('click',()=>runResult(rows[i]?.cmd)));
    root._ffRows=rows;
  }
  function runResult(cmd){ if(!cmd)return; closePalette(); cmd.run?.(); }
  function openPalette(seed=''){
    ensurePalette();
    const p=$('#ffV2Palette'); if(!p)return;
    p.hidden=false; document.body.classList.add('ff-v2-palette-open');
    const input=$('#ffV2SearchInput'); if(input){input.value=seed;renderResults(seed);requestAnimationFrame(()=>input.focus())}
  }
  function closePalette(){ const p=$('#ffV2Palette'); if(p)p.hidden=true;document.body.classList.remove('ff-v2-palette-open'); }
  function onPaletteKeydown(e){
    const buttons=$$('#ffV2Results .ff-v2-result'); if(!buttons.length)return;
    let current=Math.max(0,buttons.findIndex(b=>b.classList.contains('active')));
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault(); buttons[current]?.classList.remove('active'); current=(current+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length; buttons[current].classList.add('active'); buttons[current].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'){
      e.preventDefault(); buttons[current]?.click();
    }
  }

  function wireGlobalKeys(){
    document.addEventListener('keydown',e=>{
      const target=e.target;
      const typing=target?.matches?.('input,textarea,select,[contenteditable="true"]');
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#ffV2Palette')?.hidden===false?closePalette():openPalette();return;}
      if(e.key==='Escape'&&$('#ffV2Palette')?.hidden===false){e.preventDefault();closePalette();return;}
      if(e.key==='/'&&!typing&&$('#ffV2Palette')?.hidden!==false){e.preventDefault();openPalette();}
    });
  }

  function observeAccount(){
    const node=$('#accountPrimary'); if(!node)return;
    new MutationObserver(personalizeTopbar).observe(node,{childList:true,subtree:true,characterData:true});
  }

  function boot(){
    installSearchTrigger(); ensurePalette(); installCommandCenter(); improveQuickDock(); improveSidebar(); personalizeTopbar(); observeAccount();
  }

  Object.assign(window,{finalforgeOpenSearch:openPalette,finalforgeCloseSearch:closePalette});
  wireGlobalKeys();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('finalforge-ready',()=>setTimeout(boot,0),{once:true});
})();
