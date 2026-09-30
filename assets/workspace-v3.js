/* FinalForge Student Workspace v3 — event-driven command center, analytics and module intelligence. */
(()=>{
  'use strict';
  if(window.FINALFORGE_WORKSPACE_V3)return;
  window.FINALFORGE_WORKSPACE_V3=Object.freeze({version:'3.0.0',mode:'stability-first'});

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const DATA=()=>window.FINALFORGE_DATA||window.EXAMHUB_DATA||{};
  const esc=(value='')=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const progress=()=>read('finalforge_progress',{});
  const history=()=>read('finalforge_exam_v4_history',[]);
  const scores=()=>read('finalforge_quiz_scores',{});
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const pct=n=>`${clamp(Math.round(Number(n)||0),0,100)}%`;

  function moduleProgress(key){
    const mod=DATA().modules?.[key];
    if(!mod?.lessons?.length)return 0;
    const p=progress()[key]||{};
    const done=mod.lessons.filter((_,i)=>Boolean(p[i])).length;
    return Math.round(done/mod.lessons.length*100);
  }

  function sortedModules(){
    return Object.entries(DATA().modules||{}).sort((a,b)=>{
      const da=Date.parse(a[1]?.date||'')||Number.MAX_SAFE_INTEGER;
      const db=Date.parse(b[1]?.date||'')||Number.MAX_SAFE_INTEGER;
      return da-db;
    });
  }

  function recommendedModule(){
    const now=Date.now();
    const rows=sortedModules().map(([key,mod])=>({key,mod,p:moduleProgress(key),date:Date.parse(mod?.date||'')||0}));
    return rows.find(x=>x.date>now&&x.p<100) || rows.find(x=>x.p<100) || rows[0] || null;
  }

  function activeExam(){
    const saved=read('finalforge_exam_v4_active',null);
    return saved?.version===4&&!saved.finished?saved:null;
  }

  function latestAttempt(){
    const rows=history().filter(Boolean).sort((a,b)=>(b.finishedAt||0)-(a.finishedAt||0));
    return rows[0]||null;
  }

  function attemptScore(attempt){
    if(!attempt?.mcqTotal)return null;
    return Math.round((Number(attempt.mcqCorrect)||0)/attempt.mcqTotal*100);
  }

  function aggregateCompletion(){
    const rows=sortedModules();
    if(!rows.length)return 0;
    return Math.round(rows.reduce((sum,[key])=>sum+moduleProgress(key),0)/rows.length);
  }

  function ensureTopSearch(){
    const wrap=$('.top-account-wrap');
    if(!wrap||$('.ff-v3-search-trigger',wrap))return;
    const button=document.createElement('button');
    button.className='ff-v3-search-trigger';
    button.type='button';
    button.dataset.v3Action='command';
    button.setAttribute('aria-label','Search FinalForge');
    button.innerHTML='<span aria-hidden="true">⌕</span><b>Search</b><kbd>Ctrl K</kbd>';
    wrap.insertBefore(button,wrap.firstChild);
  }

  function ensureNav(){
    for(const host of [$('#nav'),$('#mobileNav')].filter(Boolean)){
      if($('[data-go="analytics"]',host))continue;
      const button=document.createElement('button');
      button.type='button';
      button.dataset.go='analytics';
      button.innerHTML='📊 <span>Analytics</span>';
      button.addEventListener('click',()=>window.go?.('analytics'));
      host.appendChild(button);
    }
  }

  let paletteItems=[];
  let paletteIndex=0;

  function buildPaletteItems(){
    const items=[
      {kind:'Action',label:'Go to Home',meta:'Workspace overview',action:()=>window.go?.('home')},
      {kind:'Action',label:'Open Practice Studio',meta:'Mock exams and timed papers',action:()=>window.go?.('practice')},
      {kind:'Action',label:'Open Analytics',meta:'Progress and recent attempts',action:()=>window.go?.('analytics')},
      {kind:'Action',label:'Open Resources',meta:'Private lecture and revision files',action:()=>window.go?.('resources')},
      {kind:'Action',label:'Open Planner',meta:'Recommended study tasks',action:()=>window.go?.('planner')}
    ];

    for(const [key,mod] of Object.entries(DATA().modules||{})){
      items.push({
        kind:'Module',
        label:`${mod.short||key.toUpperCase()} · ${mod.name||mod.code||key}`,
        meta:`${moduleProgress(key)}% complete${mod.date?` · ${new Date(mod.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}`:''}`,
        action:()=>{
          window.go?.('modules');
          requestAnimationFrame(()=>window.openModule?.(key));
        }
      });
      items.push({
        kind:'Practice',
        label:`Practice ${mod.short||key.toUpperCase()}`,
        meta:key==='ip'?'Quick quiz, full mock and hard Java papers':'Quick quiz and full mock papers',
        action:()=>{
          window.go?.('practice');
          requestAnimationFrame(()=>window.setPracticeMod?.(key));
        }
      });
    }

    for(const resource of (DATA().resources||[]).filter(x=>x&&x.ext!=='txt'&&x.ext!=='png').slice(0,180)){
      items.push({
        kind:'Resource',
        label:resource.title||'Study resource',
        meta:`${String(resource.module||'').toUpperCase()} · ${resource.type||resource.ext||'File'}`,
        action:()=>{
          window.go?.('resources');
          requestAnimationFrame(()=>{
            const input=$('#resourceSearch');
            if(input){
              input.value=resource.title||'';
              input.dispatchEvent(new Event('input',{bubbles:true}));
              input.focus({preventScroll:true});
            }
          });
        }
      });
    }
    return items;
  }

  function ensurePalette(){
    if($('#ffV3Command'))return;
    const shell=document.createElement('div');
    shell.id='ffV3Command';
    shell.className='ff-v3-command';
    shell.hidden=true;
    shell.innerHTML=`
      <div class="ff-v3-command-backdrop" data-v3-action="close-command"></div>
      <section class="ff-v3-command-panel" role="dialog" aria-modal="true" aria-labelledby="ffV3CommandTitle">
        <header>
          <div><span class="ff-v3-command-mark">FF</span><div><b id="ffV3CommandTitle">Search FinalForge</b><small>Jump to modules, practice, resources and analytics</small></div></div>
          <kbd>ESC</kbd>
        </header>
        <label class="ff-v3-command-input"><span aria-hidden="true">⌕</span><input id="ffV3CommandInput" autocomplete="off" placeholder="Try “IP arrays”, “practice”, or a resource name"><kbd>↵</kbd></label>
        <div id="ffV3CommandResults" class="ff-v3-command-results" role="listbox"></div>
        <footer><span>↑ ↓ Navigate</span><span>Enter Open</span><span>Esc Close</span></footer>
      </section>`;
    document.body.appendChild(shell);

    const input=$('#ffV3CommandInput');
    input?.addEventListener('input',()=>renderPalette(input.value));
    input?.addEventListener('keydown',event=>{
      const options=$$('.ff-v3-command-result','#ffV3CommandResults');
      if(event.key==='ArrowDown'){
        event.preventDefault();paletteIndex=Math.min(paletteIndex+1,Math.max(0,options.length-1));paintPaletteSelection(options);
      }else if(event.key==='ArrowUp'){
        event.preventDefault();paletteIndex=Math.max(paletteIndex-1,0);paintPaletteSelection(options);
      }else if(event.key==='Enter'){
        event.preventDefault();options[paletteIndex]?.click();
      }else if(event.key==='Escape'){
        event.preventDefault();closePalette();
      }
    });
    $('#ffV3CommandResults')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-command-index]');
      if(!button)return;
      const item=paletteItems[Number(button.dataset.commandIndex)];
      closePalette();
      item?.action?.();
    });
  }

  function paintPaletteSelection(options){
    options.forEach((node,index)=>{
      const active=index===paletteIndex;
      node.classList.toggle('selected',active);
      node.setAttribute('aria-selected',String(active));
      if(active)node.scrollIntoView({block:'nearest'});
    });
  }

  function renderPalette(query=''){
    const host=$('#ffV3CommandResults');
    if(!host)return;
    const all=buildPaletteItems();
    const q=String(query).trim().toLowerCase();
    const ranked=all.filter(item=>!q||`${item.label} ${item.meta} ${item.kind}`.toLowerCase().includes(q)).slice(0,12);
    paletteItems=ranked;
    paletteIndex=0;
    host.innerHTML=ranked.length?ranked.map((item,index)=>`
      <button class="ff-v3-command-result ${index===0?'selected':''}" type="button" role="option" aria-selected="${index===0}" data-command-index="${index}">
        <span class="ff-v3-command-kind">${esc(item.kind)}</span>
        <span class="ff-v3-command-copy"><b>${esc(item.label)}</b><small>${esc(item.meta)}</small></span>
        <span aria-hidden="true">↗</span>
      </button>`).join(''):`<div class="ff-v3-command-empty"><b>No matching result</b><span>Try a module code, “practice”, or a shorter resource title.</span></div>`;
  }

  function openPalette(initial=''){
    if(!document.body.classList.contains('ff-authenticated'))return;
    ensurePalette();
    const shell=$('#ffV3Command');
    const input=$('#ffV3CommandInput');
    shell.hidden=false;
    document.documentElement.classList.add('ff-v3-command-open');
    if(input){input.value=initial;renderPalette(initial);requestAnimationFrame(()=>input.focus({preventScroll:true}))}
  }

  function closePalette(){
    const shell=$('#ffV3Command');
    if(shell)shell.hidden=true;
    document.documentElement.classList.remove('ff-v3-command-open');
  }

  function ensureAnalytics(){
    if($('#analytics'))return;
    const main=$('.main');
    if(!main)return;
    const section=document.createElement('section');
    section.id='analytics';
    section.className='section ff-v3-analytics';
    section.setAttribute('aria-hidden','true');
    section.setAttribute('inert','');
    section.innerHTML=`
      <div class="section-head ff-v3-section-head">
        <div><div class="kicker">Study intelligence</div><h2>Progress you can act on</h2><p class="muted">A lightweight view of your local/cloud-synced study progress and completed mock papers.</p></div>
        <button class="btn primary" type="button" data-v3-action="practice-ip">Practice IP</button>
      </div>
      <div class="ff-v3-metric-grid" id="ffV3MetricGrid"></div>
      <div class="ff-v3-analytics-grid">
        <article class="card ff-v3-analytics-card"><header><div><div class="kicker">Module readiness</div><h3>Completion by module</h3></div><span class="ff-v3-status">Live</span></header><div id="ffV3ModuleBars"></div></article>
        <article class="card ff-v3-analytics-card"><header><div><div class="kicker">Recent papers</div><h3>Practice performance</h3></div></header><div id="ffV3AttemptChart"></div></article>
      </div>
      <article class="card ff-v3-next-card" id="ffV3NextCard"></article>`;
    const before=$('#roadmap',main);
    if(before)main.insertBefore(section,before);else main.appendChild(section);
  }

  function renderAnalytics(){
    ensureAnalytics();
    const section=$('#analytics');
    if(!section)return;
    const modules=sortedModules();
    const attempts=history().filter(Boolean).sort((a,b)=>(b.finishedAt||0)-(a.finishedAt||0));
    const completion=aggregateCompletion();
    const scored=attempts.map(attemptScore).filter(x=>Number.isFinite(x));
    const best=scored.length?Math.max(...scored):null;
    const latest=scored.length?scored[0]:null;
    const totalResources=(DATA().resources||[]).filter(x=>x?.ext==='pdf').length;

    $('#ffV3MetricGrid').innerHTML=`
      <article class="card ff-v3-metric"><span>Overall completion</span><strong>${completion}%</strong><small>${modules.length} active modules</small></article>
      <article class="card ff-v3-metric"><span>Completed papers</span><strong>${attempts.length}</strong><small>Saved exam attempts</small></article>
      <article class="card ff-v3-metric"><span>Best auto-marked</span><strong>${best===null?'—':`${best}%`}</strong><small>${latest===null?'Start a paper to establish a baseline':`Latest ${latest}%`}</small></article>
      <article class="card ff-v3-metric"><span>Study library</span><strong>${totalResources}</strong><small>PDF resources available</small></article>`;

    $('#ffV3ModuleBars').innerHTML=modules.map(([key,mod])=>{
      const value=moduleProgress(key);
      return `<div class="ff-v3-bar-row"><div><span>${esc(mod.short||key.toUpperCase())}</span><small>${esc(mod.name||mod.code||'Module')}</small></div><div class="ff-v3-bar-track"><i style="width:${value}%"></i></div><b>${value}%</b></div>`;
    }).join('');

    const recent=attempts.slice(0,7).reverse();
    $('#ffV3AttemptChart').innerHTML=recent.length?`
      <div class="ff-v3-attempt-bars">${recent.map((attempt,index)=>{
        const score=attemptScore(attempt);
        const height=score===null?Math.max(18,Math.round((Number(attempt.answered)||0)/(Number(attempt.total)||1)*100)):score;
        const title=attempt.title||`${String(attempt.module||'').toUpperCase()} paper`;
        return `<div class="ff-v3-attempt-col" title="${esc(title)}"><div class="ff-v3-attempt-value">${score===null?'—':`${score}%`}</div><div class="ff-v3-attempt-rail"><i style="height:${clamp(height,4,100)}%"></i></div><small>${index+1}</small></div>`;
      }).join('')}</div><div class="ff-v3-chart-caption"><span>Older</span><span>Most recent</span></div>`:
      `<div class="ff-v3-empty"><b>No completed papers yet</b><span>Your recent results will appear here after you submit a mock paper.</span><button class="btn" type="button" data-v3-action="practice-ip">Start with IP</button></div>`;

    const next=recommendedModule();
    const nextPct=next?.p??0;
    $('#ffV3NextCard').innerHTML=next?`
      <div class="ff-v3-next-icon">${esc(next.mod.icon||'◎')}</div>
      <div><div class="kicker">Recommended next action</div><h3>${esc(next.mod.short||next.key.toUpperCase())} · ${esc(next.mod.name||next.mod.code||'Module')}</h3><p class="muted">${nextPct}% complete. Continue an unfinished lesson, then reinforce it with a timed practice paper.</p></div>
      <div class="ff-v3-next-actions"><button class="btn primary" type="button" data-v3-action="module" data-module="${esc(next.key)}">Continue module</button><button class="btn" type="button" data-v3-action="command">Search workspace</button></div>`:
      `<div><div class="kicker">Recommended next action</div><h3>Choose your next practice target</h3><p class="muted">Use Command Search to jump directly to a module, resource or mock paper.</p></div><button class="btn primary" type="button" data-v3-action="command">Search workspace</button>`;
  }

  function ensureModuleOverview(){
    const grid=$('#moduleGrid');
    if(!grid)return;
    let host=$('#ffV3ModuleOverview');
    if(!host){
      host=document.createElement('div');
      host.id='ffV3ModuleOverview';
      host.className='ff-v3-module-overview';
      grid.insertAdjacentElement('beforebegin',host);
    }
    host.innerHTML=sortedModules().map(([key,mod])=>{
      const value=moduleProgress(key);
      return `<button type="button" class="ff-v3-module-radar" data-v3-action="module" data-module="${esc(key)}">
        <span class="ff-v3-ring" style="--ff-v3-progress:${value}" aria-label="${value}% complete"><i>${value}%</i></span>
        <span><b>${esc(mod.short||key.toUpperCase())}</b><small>${esc(mod.name||mod.code||'Module')}</small></span>
        <span aria-hidden="true">↗</span>
      </button>`;
    }).join('');
  }

  function ensureHomeCenter(){
    const hero=$('#home .hero-v3');
    if(!hero)return;
    let host=$('#ffV3HomeCenter');
    if(!host){
      host=document.createElement('section');
      host.id='ffV3HomeCenter';
      host.className='ff-v3-home-center';
      hero.insertAdjacentElement('afterend',host);
    }
    const next=recommendedModule();
    const saved=activeExam();
    const latest=latestAttempt();
    const latestScore=attemptScore(latest);
    const completion=aggregateCompletion();

    host.innerHTML=`
      <article class="ff-v3-command-card ff-v3-command-card-primary">
        <div><span class="ff-v3-eyebrow">Continue</span><h3>${saved?esc(saved.title||'Saved mock paper'):next?`${esc(next.mod.short||next.key.toUpperCase())} · ${esc(next.mod.name||'Continue studying')}`:'Choose your next study target'}</h3>
        <p>${saved?`${Number(saved.current||0)+1} of ${saved.questions?.length||0} questions · autosaved attempt`:next?`${next.p}% complete · continue your nearest unfinished module`:'Use search to jump to any module or resource.'}</p></div>
        <button class="btn primary" type="button" data-v3-action="${saved?'continue-exam':next?'module':'command'}"${next&&!saved?` data-module="${esc(next.key)}"`:''}>${saved?'Resume paper':next?'Continue module':'Search'}</button>
      </article>
      <article class="ff-v3-command-card">
        <div><span class="ff-v3-eyebrow">Readiness</span><h3>${completion}% overall completion</h3><p>${latest?`Latest paper: ${esc(latest.title||'Mock paper')}${latestScore===null?'':` · ${latestScore}% auto-marked`}`:'Complete your first paper to start a performance history.'}</p></div>
        <button class="btn" type="button" data-v3-action="analytics">View analytics</button>
      </article>
      <article class="ff-v3-command-card">
        <div><span class="ff-v3-eyebrow">Command search</span><h3>Find anything fast</h3><p>Search modules, private resources, practice and study actions without hunting through menus.</p></div>
        <button class="btn" type="button" data-v3-action="command">Open <kbd>Ctrl K</kbd></button>
      </article>`;
  }

  function ensurePracticeGuide(){
    const tabs=$('#practiceModuleTabs');
    if(!tabs||$('#ffV3PracticeGuide'))return;
    const host=document.createElement('div');
    host.id='ffV3PracticeGuide';
    host.className='ff-v3-practice-guide';
    host.innerHTML=`
      <article><span>01</span><div><b>Recall first</b><small>Use the quick quiz to expose weak concepts before a full paper.</small></div></article>
      <article><span>02</span><div><b>Simulate the exam</b><small>Use the two-hour paper with autosave and the question navigator.</small></div></article>
      <article><span>03</span><div><b>Push difficulty</b><small>For IP, hard and challenge papers stay focused on arrays, 2D arrays and methods.</small></div></article>`;
    tabs.insertAdjacentElement('afterend',host);
  }

  function handleAction(button){
    const action=button.dataset.v3Action;
    if(action==='command')openPalette();
    else if(action==='close-command')closePalette();
    else if(action==='analytics')window.go?.('analytics');
    else if(action==='continue-exam')window.resumePracticeExam?.();
    else if(action==='practice-ip'){
      window.go?.('practice');
      requestAnimationFrame(()=>window.setPracticeMod?.('ip'));
    }else if(action==='module'){
      const key=button.dataset.module;
      if(!key)return;
      window.go?.('modules');
      requestAnimationFrame(()=>window.openModule?.(key));
    }
  }

  function refreshFor(section){
    ensureNav();ensureTopSearch();ensurePalette();
    if(section==='home')ensureHomeCenter();
    if(section==='modules')ensureModuleOverview();
    if(section==='analytics')renderAnalytics();
    if(section==='practice')ensurePracticeGuide();
  }

  function init(){
    document.documentElement.classList.add('ff-workspace-v3');
    ensureAnalytics();
    ensureNav();
    ensureTopSearch();
    ensurePalette();
    ensureHomeCenter();
    ensureModuleOverview();
    ensurePracticeGuide();
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-v3-action]');
    if(button)handleAction(button);
  });

  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();
      openPalette();
    }else if(event.key==='Escape'&&!$('#ffV3Command')?.hidden){
      closePalette();
    }
  });

  addEventListener('finalforge-after-navigate',event=>refreshFor(String(event?.detail?.id||'')));
  addEventListener('storage',event=>{
    if(['finalforge_progress','finalforge_exam_v4_history','finalforge_quiz_scores','finalforge_exam_v4_active'].includes(event.key)){
      const active=$('.section.active')?.id;
      if(active)refreshFor(active);
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  addEventListener('finalforge-ready',init,{once:true});
})();