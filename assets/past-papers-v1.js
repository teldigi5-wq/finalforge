/* FinalForge Past Papers v1 — curated external SLIIT paper index.
   Links to public/third-party source pages; FinalForge does not republish their copyrighted paper contents. */
(() => {
  'use strict';

  const PAPERS = [
    {
      id:'dcn-2024-mock', module:'dcn', status:'current', year:'2024', code:'IE1030', source:'Scribd',
      title:'IE1030 2024/JUL Final Examination Mock Paper', pages:'41 pages',
      url:'https://www.scribd.com/document/1034302167/DCN-Modle-Paper',
      note:'Current IE1030 module code. Useful for the 2024 exam pattern; hosted by a third party, so availability may change.'
    },
    {
      id:'dcn-link-layer', module:'dcn', status:'current', year:'Public archive', code:'IE1030', source:'Studocu',
      title:'IE1030 Link Layer Final Exam', pages:'16 pages',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/information-technology/ie1030-link-layer-final-exam/167206095',
      note:'Uses the current IE1030 module code and focuses on link-layer/final-exam material. Third-party study archive.'
    },
    {
      id:'ip-archive', module:'ip', status:'legacy', year:'2022–2023', code:'IT1010 → IT1120', source:'GitHub',
      title:'SLIIT Introduction to Programming — 9-paper archive with answers', pages:'9 paper folders',
      url:'https://github.com/anupaprabhasara/SLIIT-First-Semester-IP-Past-Papers-with-Answers',
      note:'Legacy IT1010 papers from 2022–2023. SLIIT later pairs IT1010 with current IT1120 for repeat/prorata purposes; use these for programming patterns, not as the exact 2026 Java format.'
    },
    {
      id:'mc-2021', module:'mc', status:'legacy', year:'2021', code:'IT1030 → IT1130', source:'Studocu',
      title:'MC Final Exam 2021 June — Answer Key and Solutions', pages:'Archive document',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/information-technology/mc-final-exam-2021-june-answer-key-and-solutions/127886845',
      note:'Legacy Mathematics for Computing material with worked-answer context. Useful for recurring methods; verify topics against current IT1130.'
    },
    {
      id:'mc-2019', module:'mc', status:'legacy', year:'2019', code:'IT1030 → IT1130', source:'Studocu',
      title:'IT1030 Final Exam 2019 — Mathematics for Computing', pages:'Past paper',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/mathematics-for-computing/it-1030-final-exam-2019-mathematics-for-computing/142428206',
      note:'Legacy IT1030 final. Good for practising mathematics techniques, but the current module code and assessment structure are IT1130.'
    },
    {
      id:'mc-2018', module:'mc', status:'legacy', year:'2018', code:'IT1030 → IT1130', source:'Studocu',
      title:'IT1030 Final Exam — June Intake 2018', pages:'Past paper',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/mathematics-for-computing/it-1030-final-exam-mathematics-for-computing-june-2018/142428232',
      note:'Legacy IT1030 final for extra calculations and structured practice. Treat it as historical material, not the current exact paper format.'
    },
    {
      id:'mc-2017', module:'mc', status:'legacy', year:'2017', code:'IT1030 → IT1130', source:'Studocu',
      title:'IT1030 Final Exam 2017 — Mathematics for Computing', pages:'Past paper',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/mathematics-for-computing/it-1030-final-exam-mathematics-for-computing-2017/142428228',
      note:'Older IT1030 final. Best used to drill core mathematical methods that still overlap with the current syllabus.'
    },
    {
      id:'fc-related-it1020', module:'fc', status:'related', year:'Legacy', code:'IT1020 (not IT1140)', source:'Studocu',
      title:'IT1020 Sample Exam — Computer Systems and Circuits', pages:'Related legacy material',
      url:'https://www.studocu.com/row/document/sri-lanka-institute-of-information-technology/information-technology/it1020-sample-paper-nice/63743127',
      note:'Related historical computer-systems material only. IT1020 is not being presented as an equivalent of current IT1140 Fundamentals of Computing.'
    }
  ];

  const MODULES = {
    dcn:{short:'DCN',code:'IE1030'}, ip:{short:'IP',code:'IT1120'}, mc:{short:'MC',code:'IT1130'}, fc:{short:'FC',code:'IT1140'}
  };
  let active='all';
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusLabel=s=>s==='current'?'Current code':s==='legacy'?'Legacy syllabus':'Related only';

  function ensureSection(){
    if($('#past-papers')) return;
    const section=document.createElement('section');
    section.id='past-papers';
    section.className='section';
    section.innerHTML='<div id="pastPapersRoot"></div>';
    const anchor=$('#schedule')||$('#roadmap');
    if(anchor) anchor.before(section); else document.querySelector('.main')?.appendChild(section);
  }

  function ensureNav(root){
    if(!root||root.querySelector('[data-go="past-papers"]'))return;
    const b=document.createElement('button');
    b.type='button';
    b.dataset.go='past-papers';
    b.setAttribute('onclick',"go('past-papers')");
    b.innerHTML='📄 <span>Past Papers</span>';
    const before=root.querySelector('[data-go="schedule"]')||root.querySelector('[data-go="planner"]');
    before?root.insertBefore(b,before):root.appendChild(b);
  }

  function practice(module){
    window.go?.('practice');
    setTimeout(()=>window.setPracticeMod?.(module),40);
  }

  function card(p){
    const mod=MODULES[p.module];
    return `<article class="card past-card">
      <div class="past-card-head"><div><div class="kicker">${esc(mod.short)} · ${esc(p.code)}</div><h3>${esc(p.title)}</h3></div><span class="past-badge ${esc(p.status)}">${esc(statusLabel(p.status))}</span></div>
      <div class="past-meta"><span>${esc(p.year)}</span><span>${esc(p.source)}</span><span>${esc(p.pages)}</span></div>
      <p class="past-note">${esc(p.note)}</p>
      <div class="past-actions"><a class="btn primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a><button class="btn" type="button" onclick="finalforgePastPaperPractice('${esc(p.module)}')">Practise ${esc(mod.short)}</button></div>
    </article>`;
  }

  function render(){
    const root=$('#pastPapersRoot'); if(!root)return;
    const rows=active==='all'?PAPERS:PAPERS.filter(p=>p.module===active);
    const current=PAPERS.filter(p=>p.status==='current').length;
    const legacy=PAPERS.filter(p=>p.status==='legacy').length;
    const fcNotice=active==='all'||active==='fc' ? `<article class="card past-card past-empty"><div class="kicker">FC · IT1140</div><h3>No exact public IT1140 past paper verified yet</h3><p class="past-note">The current IT1140 module and exam are real, but I did not find a trustworthy publicly accessible exact IT1140 paper to add. FinalForge keeps this honest instead of relabelling an unrelated old paper. Use the current FC practice bank while checking official SLIIT sources.</p><div class="past-actions"><button class="btn primary" type="button" onclick="finalforgePastPaperPractice('fc')">Open FC practice</button><a class="btn" href="https://courseweb.sliit.lk/course/index.php?categoryid=3627" target="_blank" rel="noopener noreferrer">Verify current modules ↗</a></div></article>`:'';
    root.innerHTML=`
      <div class="section-head"><div><div class="kicker">Curated SLIIT archive</div><h2>Past Papers</h2><div class="muted">Current-code sources first, useful legacy papers second — with syllabus differences labelled clearly.</div></div></div>
      <div class="past-hero">
        <article class="card past-hero-main"><div class="kicker">Study from real exam history</div><h2>Past-paper practice without mixing up syllabuses.</h2><p class="muted">FinalForge links to publicly accessible source pages rather than copying third-party papers. Older papers remain useful for question style and problem solving, but always compare them with the current module outline.</p><div class="past-actions"><a class="btn primary" href="https://courseweb.sliit.lk/course/index.php?categoryid=3627" target="_blank" rel="noopener noreferrer">Current SLIIT modules ↗</a><button class="btn" type="button" onclick="go('practice')">Generated mock exams</button></div></article>
        <article class="card past-summary"><div><strong>${PAPERS.length}</strong><span class="muted small">curated sources</span></div><div><strong>${current}</strong><span class="muted small">current-code sources</span></div><div><strong>${legacy}</strong><span class="muted small">legacy papers</span></div><div><strong>4</strong><span class="muted small">modules covered</span></div></article>
      </div>
      <div class="past-tabs">${[['all','All'],['dcn','DCN'],['ip','IP'],['mc','MC'],['fc','FC']].map(([k,l])=>`<button class="btn filter-btn ${active===k?'active':''}" type="button" onclick="setPastPaperFilter('${k}')">${l}</button>`).join('')}</div>
      <div class="past-grid">${rows.map(card).join('')}${fcNotice}</div>
      <div class="past-disclaimer"><b>Source & copyright note:</b> FinalForge does not claim ownership of linked papers and does not mirror their full contents. External resources may require an account or may change. “Legacy syllabus” means the source uses an older module code; always verify current SLIIT announcements, assessment structure and allowed materials before an exam.</div>`;
    window.finalforgeRefreshEffects?.();
  }

  function setFilter(value){ if(value!=='all'&&!MODULES[value])return;active=value;render(); }
  function boot(){ensureSection();ensureNav($('#nav'));ensureNav($('#mobileNav'));render();}

  Object.assign(window,{renderPastPapers:render,setPastPaperFilter:setFilter,finalforgePastPaperPractice:practice});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('finalforge-ready',boot,{once:true});
})();
