const D=window.FINALFORGE_DATA, modules=D.modules, resources=D.resources;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ICONS={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9A1.5 1.5 0 0 1 19 21h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
  modules:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/></svg>',
  resources:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v10A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M3.5 10h17"/></svg>',
  practice:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3V1.5M21 12h1.5M12 21v1.5M3 12H1.5"/></svg>',
  schedule:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
  planner:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m8 9 1.5 1.5L12 8M14 10h3M8 15l1.5 1.5L12 14M14 16h3"/></svg>',
  roadmap:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M7.5 16.5 11 13a3 3 0 0 0 0-4.2L9.5 7.3M14.5 7.5 13 9a3 3 0 0 0 0 4.2l1.5 1.5"/></svg>',
  file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4 4V21H6z"/><path d="M14 2.5v5h5M9 13h6M9 17h5"/></svg>',
  open:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5"/></svg>'
};
const icon=name=>ICONS[name]||ICONS.file;
const NAV=[['home','home','Home'],['modules','modules','Modules'],['resources','resources','Resources'],['practice','practice','Practice'],['schedule','schedule','Schedule'],['planner','planner','Planner'],['roadmap','roadmap','Roadmap']];
const isMobileRuntime=()=>typeof window.finalforgeIsMobile==='function'?window.finalforgeIsMobile():document.documentElement.classList.contains('ff-real-mobile');
let toastTimer=0;function toast(t){const x=$('#toast');if(!x)return;clearTimeout(toastTimer);x.textContent=t;x.setAttribute('role','status');x.setAttribute('aria-live','polite');x.setAttribute('aria-atomic','true');x.classList.add('show');toastTimer=setTimeout(()=>x.classList.remove('show'),2200)}
function nav(){let h=NAV.map((n,i)=>`<button type="button" data-go="${n[0]}" class="${i?'':'active'}"${i?'':' aria-current="page"'} onclick="go('${n[0]}')"><span class="ff-nav-icon">${icon(n[1])}</span><span>${n[2]}</span></button>`).join('');$('#nav').innerHTML=h;$('#mobileNav').innerHTML=h}
function go(id){
  const target=String(id||'');
  const targetSection=document.getElementById(target);
  if(!targetSection?.classList.contains('section'))return false;
  try{if(typeof window.finalforgeBeforeNavigate==='function'&&window.finalforgeBeforeNavigate(target)===false)return false}catch(err){console.warn('[FinalForge] beforeNavigate fallback.',err)}
  const mobile=isMobileRuntime();
  const current=$('.section.active');
  if(current&&current.id!==target){
    if(!mobile){current.classList.add('section-leaving');setTimeout(()=>current.classList.remove('section-leaving'),190)}
    else current.classList.remove('section-leaving');
  }
  $$('.section').forEach(s=>{const active=s.id===target;s.classList.toggle('active',active);s.setAttribute('aria-hidden',String(!active));if(active)s.removeAttribute('inert');else s.setAttribute('inert','')});
  $$('[data-go]').forEach(b=>{const active=b.dataset.go===target;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(target==='resources')renderResources();
  if(target==='practice'&&typeof renderPractice==='function')renderPractice();
  if(target==='schedule')renderSchedule();
  if(target==='planner')renderPlanner();
  try{window.scrollTo(0,0)}catch{}
  try{window.finalforgeAfterNavigate?.(target)}catch(err){console.warn('[FinalForge] afterNavigate fallback.',err)}
  window.dispatchEvent(new CustomEvent('finalforge-after-navigate',{detail:{id:target,mobile}}));
  if(mobile)window.dispatchEvent(new CustomEvent('finalforge-mobile-navigate',{detail:{id:target}}));
  return true;
}
function fmtBytes(n){if(n<1024*1024)return (n/1024).toFixed(0)+' KB';return (n/1024/1024).toFixed(1)+' MB'}
function examDate(m){return new Date(m.date)}
function diffText(m){let ms=examDate(m)-Date.now();if(ms<=0)return 'Exam started/passed';let d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000);return d?`${d}d ${h}h remaining`:`${h}h remaining`}
function progress(){return JSON.parse(localStorage.getItem('finalforge_progress')||'{}')}
function setLesson(mod,idx,v){let p=progress();p[mod]??={};p[mod][idx]=v;localStorage.setItem('finalforge_progress',JSON.stringify(p));renderModules();renderHome();toast(v?'Marked complete':'Marked incomplete')}
function modulePct(k){let m=modules[k],p=progress()[k]||{},done=m.lessons.filter((_,i)=>p[i]).length;return Math.round(done/m.lessons.length*100)}
function nextModule(){return Object.entries(modules).filter(([k,m])=>examDate(m)>Date.now()).sort((a,b)=>examDate(a[1])-examDate(b[1]))[0]||Object.entries(modules).sort((a,b)=>examDate(b[1])-examDate(a[1]))[0]}
function renderHome(){let [k,n]=nextModule();$('#nextName').textContent=`${n.code} • ${n.name}`;$('#nextDate').textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Colombo'}).format(examDate(n));$('#nextType').textContent=n.type;let total=0,done=0,p=progress();Object.entries(modules).forEach(([k,m])=>{total+=m.lessons.length;done+=m.lessons.filter((_,i)=>p[k]?.[i]).length});$('#overall').textContent=Math.round(done/total*100)+'%';$('#resCount').textContent=resources.filter(r=>r.ext==='pdf').length;$('#moduleCount').textContent=Object.keys(modules).length;$('#examCount').textContent=4;$('#homeModules').innerHTML=Object.entries(modules).sort((a,b)=>examDate(a[1])-examDate(b[1])).map(([key,m])=>moduleCard(key,m,true)).join('');tickCountdown()}
function tickCountdown(){let [,m]=nextModule(),ms=Math.max(0,examDate(m)-Date.now()),d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),mi=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);[['cdD',d],['cdH',h],['cdM',mi],['cdS',s]].forEach(([id,v])=>{const el=$('#'+id);if(el)el.textContent=String(v).padStart(2,'0')})}
function moduleCard(key,m,compact=false){let pct=modulePct(key);let monogram=(m.short||key).slice(0,3).toUpperCase();return `<article class="card module-card"><div class="module-title"><div class="module-icon ff-module-monogram">${monogram}</div><div><div class="kicker">${m.code}</div><h3>${m.name}</h3></div></div><div class="module-meta"><span class="chip">${m.type}</span><span class="chip">${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Colombo'}).format(examDate(m))}</span><span class="chip urgency">${diffText(m)}</span></div><div class="muted small">${m.coverage}</div><div class="progressbar"><i style="width:${pct}%"></i></div><div class="small muted">${pct}% of syllabus marked complete</div><div class="module-actions"><button class="btn primary" onclick="go('modules');setTimeout(()=>openModule('${key}'),80)">Open module</button>${compact?'':`<button class="btn" onclick="openModule('${key}')">${$('#detail-'+key)?.classList.contains('open')?'Close':'Study'}</button>`}</div></article>`}
function renderModules(){$('#moduleGrid').innerHTML=Object.entries(modules).sort((a,b)=>examDate(a[1])-examDate(b[1])).map(([k,m])=>moduleCard(k,m)).join('');$('#moduleDetails').innerHTML=Object.entries(modules).map(([k,m])=>detailHTML(k,m)).join('')}
function detailHTML(k,m){let p=progress()[k]||{};return `<article class="card module-detail" id="detail-${k}"><div class="detail-grid"><div class="detail-card"><div class="kicker">${m.code} • Exam format</div><h2>${m.name}</h2><ol class="rules">${m.format.map(x=>`<li>${x}</li>`).join('')}</ol><div class="warnbox"><b>Rules / allowed items</b><ul class="rules">${m.rules.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="goodbox"><b>Coverage</b><br>${m.coverage}</div></div><div class="detail-card"><div class="kicker">Study checklist</div><h3>${m.lessons.length} examinable lesson blocks</h3><div class="lesson-list">${m.lessons.map((l,i)=>`<div class="lesson"><div class="lesson-top"><div><b>${l[0]} — ${l[1]}</b></div><label><input type="checkbox" ${p[i]?'checked':''} onchange="setLesson('${k}',${i},this.checked)">Done</label></div><div class="topics">${l[2].map(t=>`<span class="chip">${t}</span>`).join('')}</div></div>`).join('')}</div></div></div><div class="detail-card" style="border-top:1px solid var(--line)"><button class="btn" onclick="filterResources('${k}')">View ${m.short} resources</button></div></article>`}
function openModule(k){let el=$('#detail-'+k);if(!el)return;let opening=!el.classList.contains('open');$$('.module-detail').forEach(x=>x.classList.remove('open'));if(opening){el.classList.add('open');const behavior=isMobileRuntime()?'auto':'smooth';setTimeout(()=>el.scrollIntoView({behavior,block:'start'}),30)}}
let resMod='all',resType='all';
async function openResourceButton(button,resourceId){
  if(!button||button.dataset.busy==='1')return false;
  const original=button.innerHTML;
  button.dataset.busy='1';button.disabled=true;button.setAttribute('aria-busy','true');button.innerHTML='<span class="ff-btn-spinner" aria-hidden="true"></span><span>Preparing…</span>';
  try{
    const ok=await window.finalforgeOpenResource?.(resourceId);
    if(ok)toast('Secure resource opened in a new tab.');
    return Boolean(ok);
  }finally{
    button.disabled=false;button.removeAttribute('aria-busy');delete button.dataset.busy;button.innerHTML=original;
  }
}
function renderResources(){let q=($('#resourceSearch')?.value||'').toLowerCase().trim();let arr=resources.filter(r=>r.ext!=='txt'&&r.ext!=='png').filter(r=>(resMod==='all'||r.module===resMod)&&(resType==='all'||r.type===resType)&&(!q||(`${r.title} ${r.type} ${r.module}`).toLowerCase().includes(q)));$('#resourceGrid').innerHTML=arr.map(r=>`<article class="card resource ff-resource-row"><div class="ff-resource-icon">${icon('file')}</div><div class="ff-resource-copy"><div class="kicker">${r.module.toUpperCase()} • ${r.type}</div><b>${r.title}</b><div class="ff-resource-meta"><span>${r.ext.toUpperCase()}</span><span>${fmtBytes(r.size)}</span></div></div><div class="ff-resource-actions">${r.resourceId?`<button class="btn primary" type="button" onclick="openResourceButton(this,'${r.resourceId}')"><span>Open</span>${icon('open')}</button>`:'<button class="btn" type="button" disabled>Unavailable</button>'}</div></article>`).join('')||'<div class="card ff-empty-state" role="status"><h3>No resources match</h3><p>Clear the filters or try a broader search to see the full library.</p><button class="btn primary" type="button" onclick="clearResourceFilters()">Clear filters</button></div>';$$('.filter-btn[data-mod]').forEach(b=>{const active=b.dataset.mod===resMod;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});$$('.filter-btn[data-type]').forEach(b=>{const active=b.dataset.type===resType;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
function setResMod(x){resMod=x;renderResources()}function setResType(x){resType=x;renderResources()}function filterResources(k){resMod=k;go('resources')}function clearResourceFilters(){resMod='all';resType='all';if($('#resourceSearch'))$('#resourceSearch').value='';renderResources();toast('Resource filters cleared')}
function renderSchedule(){let id=$('#trackSelect').value,track=D.tracks.find(x=>x.id===id)||D.tracks[0];$('#trackNote').textContent=track.note;$('#scheduleRows').innerHTML=track.exams.map(e=>`<div class="card timeline-row"><div class="date">${e[0]}<div class="type">${e[1]}</div></div><div><b>${e[2]} — ${e[3]}</b><div class="type">${e[4]}</div></div><span class="pill">Session 1</span></div>`).join('')}
function renderPlanner(){let now=Date.now(),ordered=Object.entries(modules).sort((a,b)=>examDate(a[1])-examDate(b[1])),p=progress();let tasks=[];for(const [k,m] of ordered){if(examDate(m)<now)continue;let remaining=m.lessons.map((l,i)=>({l,i})).filter(x=>!p[k]?.[x.i]);for(const x of remaining.slice(0,3))tasks.push({k,m,l:x.l,i:x.i});if(tasks.length>=8)break}$('#plannerTasks').innerHTML=tasks.length?tasks.map(t=>`<div class="task"><div class="ff-task-monogram">${(t.m.short||t.k).slice(0,3).toUpperCase()}</div><div><b>${t.m.short}: ${t.l[0]} — ${t.l[1]}</b><div class="muted small">${t.l[2].slice(0,3).join(' • ')}</div></div></div>`).join(''):'<div class="ff-empty-state" role="status"><h3>You are caught up</h3><p>Every current syllabus block is marked complete. Reinforce it with a timed practice paper.</p><button class="btn primary" type="button" onclick="go(\'practice\')">Start practice</button></div>';let first=nextModule()[1];$('#focusName').textContent=`Focus first: ${first.short} — ${first.name}`;$('#focusWhy').textContent=`It is the next scheduled exam (${diffText(first)}). Finish incomplete lessons, then practise tutorials/practicals from the resource library.`}
function startCountdownTicker(){setInterval(()=>{if(!document.hidden&&$('#home')?.classList.contains('active'))tickCountdown()},1000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#home')?.classList.contains('active'))tickCountdown()});
nav();renderModules();renderHome();renderResources();renderSchedule();renderPlanner();startCountdownTicker();$('#resourceSearch').addEventListener('input',renderResources);$('#trackSelect').addEventListener('change',renderSchedule);
