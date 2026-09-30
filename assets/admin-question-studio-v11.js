/* FinalForge Admin Question Studio v11 — server-authorized question authoring and bank analytics. */
(()=>{
  'use strict';
  if(window.FINALFORGE_ADMIN_QUESTION_STUDIO_V11)return;
  window.FINALFORGE_ADMIN_QUESTION_STUDIO_V11=Object.freeze({version:'11.0.0',mode:'admin-question-studio'});

  const SOURCE='admin-v75';
  const ADMIN_API='/api/question-studio-admin';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let questions=[];
  let editingId='';
  let activeAdminUid='';
  let requestBusy=false;

  function auth(){return window.firebase?.apps?.length?window.firebase.auth():null}
  function bank(){return window.EXAMHUB_PRACTICE||{}}
  function data(){return window.FINALFORGE_DATA||window.EXAMHUB_DATA||{}}

  async function verifiedAdmin(user=auth()?.currentUser){
    if(!user)return null;
    try{
      const token=await user.getIdTokenResult(true);
      return token?.claims?.admin===true&&token?.claims?.email_verified===true?user:null;
    }catch{return null}
  }

  function ensureAdminNav(){
    if(document.querySelector('[data-go="admin"]'))return;
    const button='<button type="button" data-go="admin" onclick="go(\'admin\')">🛡️ <span>Admin</span></button>';
    $('#nav')?.insertAdjacentHTML('beforeend',button);
    $('#mobileNav')?.insertAdjacentHTML('beforeend',button);
  }

  function clearAdminSurface(){
    activeAdminUid='';questions=[];editingId='';
    $('#ffV11AdminStudio')?.remove();
    const section=$('#admin');
    if(section?.dataset.ffV11Owned==='1')section.remove();
    document.querySelectorAll('[data-go="admin"]').forEach(button=>button.remove());
  }

  function moduleOptions(){
    const modules=data().modules||{};
    return Object.entries(modules).map(([key,module])=>`<option value="${esc(key)}">${esc((module.short||key).toUpperCase())} · ${esc(module.name||key)}</option>`).join('');
  }

  function ensureSection(){
    let section=$('#admin');
    if(!section){
      section=document.createElement('section');
      section.id='admin';section.className='section';section.dataset.ffV11Owned='1';section.setAttribute('aria-hidden','true');section.setAttribute('inert','');
      $('.main')?.appendChild(section);
    }
    let root=$('#ffV11AdminStudio',section);
    if(root)return root;
    root=document.createElement('div');root.id='ffV11AdminStudio';root.className='ff-v11-admin-studio';
    root.innerHTML=`
      <header class="ff-v11-hero">
        <div><small>v75 · Administrator tools</small><h1>Question Studio</h1><p>Create, review and publish practice questions through a server-authorized workflow. Bank analytics below measure content coverage and quality—not student performance.</p></div>
        <div class="ff-v11-security"><span></span><div><b>Admin claim required</b><small>Every read and write is re-authorized by the API.</small></div></div>
      </header>
      <div class="ff-v11-metrics" data-v11-metrics></div>
      <section class="ff-v11-bank-health" data-v11-bank-health></section>
      <div class="ff-v11-layout">
        <section class="ff-v11-editor-card">
          <header><div><small>Authoring workspace</small><h2 data-v11-editor-title>New question</h2></div><button class="btn" type="button" data-v11-reset>New</button></header>
          <form data-v11-form autocomplete="off">
            <div class="ff-v11-form-grid compact">
              <label><span>Module</span><select name="module" required>${moduleOptions()}</select></label>
              <label><span>Type</span><select name="kind"><option value="mcq">MCQ</option><option value="code">Java coding</option></select></label>
              <label><span>Status</span><select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label>
              <label><span>Coverage / lesson</span><input name="coverage" type="number" min="1" max="30" value="1" required></label>
            </div>
            <label><span>Topic</span><input name="topic" maxlength="160" placeholder="e.g. Methods and return values" required></label>
            <label><span>Question</span><textarea name="q" rows="5" maxlength="4000" placeholder="Write the complete question…" required></textarea></label>
            <div data-v11-mcq-fields>
              <label><span>Options · one per line</span><textarea name="options" rows="5" placeholder="Option A\nOption B\nOption C\nOption D"></textarea></label>
              <div class="ff-v11-form-grid compact"><label><span>Correct option number</span><input name="answer" type="number" min="1" max="6" value="1"></label><label><span>Code snippet · optional</span><textarea name="snippet" rows="3" maxlength="5000"></textarea></label></div>
            </div>
            <div data-v11-code-fields hidden>
              <label><span>Self-check rubric · one point per line</span><textarea name="rubric" rows="5" placeholder="Validate input before processing\nUse the requested method return type"></textarea></label>
              <label><span>Starter code · optional</span><textarea name="starter" rows="8" maxlength="10000" spellcheck="false"></textarea></label>
              <div class="ff-v11-form-grid compact"><label><span>Pattern · optional</span><input name="pattern" maxlength="80" placeholder="methods"></label><label><span>Supporting snippet · optional</span><textarea name="codeSnippet" rows="3" maxlength="5000"></textarea></label></div>
            </div>
            <label><span>Explanation / author note · optional</span><textarea name="explanation" rows="3" maxlength="3500"></textarea></label>
            <div class="ff-v11-editor-actions"><button class="btn primary" type="submit" data-v11-save>Save question</button><span data-v11-form-status role="status" aria-live="polite"></span></div>
          </form>
        </section>
        <section class="ff-v11-library-card">
          <header><div><small>Custom bank</small><h2>Drafts & published questions</h2></div><button class="btn" type="button" data-v11-refresh>Refresh</button></header>
          <div class="ff-v11-filters"><select data-v11-filter-module><option value="all">All modules</option>${moduleOptions()}</select><select data-v11-filter-status><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select><input data-v11-search type="search" placeholder="Search topic or question"></div>
          <div class="ff-v11-question-list" data-v11-list></div>
        </section>
      </div>`;
    section.appendChild(root);
    bind(root);return root;
  }

  function apiHeaders(token){return {Accept:'application/json','Content-Type':'application/json','X-FinalForge-Token':token}}
  async function requestAdmin(method='GET',body=null){
    const user=await verifiedAdmin();
    if(!user)throw new Error('Administrator session is no longer valid.');
    const token=await user.getIdToken(false);
    const response=await fetch(ADMIN_API,{method,headers:apiHeaders(token),credentials:'same-origin',cache:'no-store',body:body===null?undefined:JSON.stringify(body)});
    const text=await response.text();let result={};try{result=text?JSON.parse(text):{}}catch{}
    if(!response.ok)throw new Error(result?.error||'Question service request failed.');
    return result;
  }

  function builtInQuestions(){
    const rows=[];
    Object.entries(bank()).forEach(([module,group])=>{
      ['mcq','code'].forEach(kind=>(Array.isArray(group?.[kind])?group[kind]:[]).forEach(question=>{
        if(question?._finalforgeSource===SOURCE)return;
        rows.push({module,kind,topic:String(question?.topic||'General'),coverage:Number(question?.coverage)||0,q:String(question?.q||''),e:String(question?.e||''),o:Array.isArray(question?.o)?question.o:[],p:Array.isArray(question?.p)?question.p:[]});
      }));
    });
    return rows;
  }

  function analytics(){
    const builtIn=builtInQuestions();
    const custom=questions;
    const published=custom.filter(item=>item.status==='published');
    const drafts=custom.filter(item=>item.status==='draft');
    const all=[...builtIn,...custom];
    const explained=all.filter(item=>String(item.e||'').trim()).length;
    const explanationRate=all.length?Math.round(explained/all.length*100):0;
    const coverageRows=Object.entries(data().modules||{}).map(([module,meta])=>{
      const expected=Math.max(1,Array.isArray(meta?.lessons)?meta.lessons.length:1);
      const present=new Set(all.filter(item=>item.module===module&&Number(item.coverage)>0).map(item=>Number(item.coverage)));
      const gaps=[];for(let index=1;index<=expected;index++)if(!present.has(index))gaps.push(index);
      return {module,short:(meta?.short||module).toUpperCase(),expected,present:present.size,gaps};
    });
    return {builtIn,custom,published,drafts,all,explanationRate,coverageRows};
  }

  function renderAnalytics(root){
    const stats=analytics();
    const metrics=$('[data-v11-metrics]',root);
    metrics.innerHTML=`
      <article><span>Total bank</span><strong>${stats.all.length}</strong><small>${stats.builtIn.length} built-in + ${stats.custom.length} custom</small></article>
      <article><span>Published custom</span><strong>${stats.published.length}</strong><small>Delivered only to authenticated approved accounts</small></article>
      <article><span>Drafts</span><strong>${stats.drafts.length}</strong><small>Admin-only until published</small></article>
      <article><span>Explanation coverage</span><strong>${stats.explanationRate}%</strong><small>Bank-quality metric, not a student score</small></article>`;
    const health=$('[data-v11-bank-health]',root);
    health.innerHTML=`<header><div><small>Question bank analytics</small><h2>Coverage health</h2><p>Counts describe authored content only. FinalForge does not currently centralize per-question student performance.</p></div><span>${stats.coverageRows.filter(row=>!row.gaps.length).length}/${stats.coverageRows.length} modules fully mapped</span></header><div class="ff-v11-health-grid">${stats.coverageRows.map(row=>`<article><div><b>${esc(row.short)}</b><span>${row.present}/${row.expected} lesson slots covered</span></div><div class="ff-v11-health-meter"><i style="width:${Math.min(100,Math.round(row.present/row.expected*100))}%"></i></div><small>${row.gaps.length?`Missing: ${row.gaps.join(', ')}`:'No numbered coverage gaps detected'}</small></article>`).join('')}</div>`;
  }

  function filteredQuestions(root){
    const module=$('[data-v11-filter-module]',root)?.value||'all';
    const status=$('[data-v11-filter-status]',root)?.value||'all';
    const query=($('[data-v11-search]',root)?.value||'').trim().toLowerCase();
    return questions.filter(item=>(module==='all'||item.module===module)&&(status==='all'||item.status===status)&&(!query||`${item.topic} ${item.q}`.toLowerCase().includes(query)));
  }

  function renderList(root){
    const list=$('[data-v11-list]',root);if(!list)return;
    const rows=filteredQuestions(root);
    list.innerHTML=rows.length?rows.map(item=>`<article class="ff-v11-question-row" data-v11-id="${esc(item.id)}"><div class="ff-v11-question-meta"><span class="${item.status==='published'?'published':'draft'}">${esc(item.status)}</span><span>${esc(String(item.module||'').toUpperCase())}</span><span>${esc(item.kind==='code'?'Java coding':'MCQ')}</span><span>Coverage ${esc(item.coverage)}</span></div><h3>${esc(item.topic)}</h3><p>${esc(item.q)}</p><div class="ff-v11-row-actions"><button class="btn" type="button" data-v11-edit="${esc(item.id)}">Edit</button><button class="btn danger" type="button" data-v11-delete="${esc(item.id)}">Delete</button></div></article>`).join(''):'<div class="ff-v11-empty"><b>No custom questions match</b><span>Create a new question or clear the filters.</span></div>';
  }

  function render(root){renderAnalytics(root);renderList(root)}

  function setKindFields(root,kind){
    const code=kind==='code';
    const mcq=$('[data-v11-mcq-fields]',root),coding=$('[data-v11-code-fields]',root);
    if(mcq)mcq.hidden=code;if(coding)coding.hidden=!code;
  }

  function resetForm(root){
    editingId='';
    const form=$('[data-v11-form]',root);form?.reset();
    if(form?.elements?.coverage)form.elements.coverage.value='1';
    if(form?.elements?.answer)form.elements.answer.value='1';
    $('[data-v11-editor-title]',root).textContent='New question';
    $('[data-v11-form-status]',root).textContent='';
    setKindFields(root,'mcq');
  }

  function populateForm(root,item){
    const form=$('[data-v11-form]',root);if(!form||!item)return;
    editingId=item.id;
    form.elements.module.value=item.module;
    form.elements.kind.value=item.kind;
    form.elements.status.value=item.status;
    form.elements.coverage.value=item.coverage;
    form.elements.topic.value=item.topic||'';
    form.elements.q.value=item.q||'';
    form.elements.options.value=(item.o||[]).join('\n');
    form.elements.answer.value=Number.isInteger(item.a)?item.a+1:1;
    form.elements.snippet.value=item.kind==='mcq'?(item.snippet||''):'';
    form.elements.rubric.value=(item.p||[]).join('\n');
    form.elements.starter.value=item.starter||'';
    form.elements.pattern.value=item.pattern||'';
    form.elements.codeSnippet.value=item.kind==='code'?(item.snippet||''):'';
    form.elements.explanation.value=item.e||'';
    $('[data-v11-editor-title]',root).textContent='Edit question';
    setKindFields(root,item.kind);
    $('.ff-v11-editor-card',root)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function formQuestion(root){
    const form=$('[data-v11-form]',root);const kind=form.elements.kind.value;
    const lines=value=>String(value||'').split('\n').map(item=>item.trim()).filter(Boolean);
    return {
      module:form.elements.module.value,
      kind,
      status:form.elements.status.value,
      coverage:Number(form.elements.coverage.value),
      topic:form.elements.topic.value.trim(),
      q:form.elements.q.value.trim(),
      o:kind==='mcq'?lines(form.elements.options.value):[],
      a:kind==='mcq'?Math.max(0,Number(form.elements.answer.value)-1):null,
      e:form.elements.explanation.value.trim(),
      snippet:(kind==='mcq'?form.elements.snippet.value:form.elements.codeSnippet.value).trim(),
      p:kind==='code'?lines(form.elements.rubric.value):[],
      starter:kind==='code'?form.elements.starter.value.trim():'',
      pattern:kind==='code'?form.elements.pattern.value.trim():''
    };
  }

  async function loadQuestions(root,{quiet=false}={}){
    if(requestBusy)return;
    requestBusy=true;
    const refresh=$('[data-v11-refresh]',root);if(refresh)refresh.disabled=true;
    try{
      const result=await requestAdmin('GET');
      questions=Array.isArray(result.questions)?result.questions:[];
      render(root);
      if(!quiet)window.toast?.('Question bank refreshed');
    }catch(error){
      $('[data-v11-list]',root).innerHTML=`<div class="ff-v11-empty error"><b>Question bank unavailable</b><span>${esc(error?.message||'Try again shortly.')}</span></div>`;
    }finally{requestBusy=false;if(refresh)refresh.disabled=false}
  }

  async function saveQuestion(root,event){
    event.preventDefault();if(requestBusy)return;
    const status=$('[data-v11-form-status]',root),button=$('[data-v11-save]',root);
    requestBusy=true;button.disabled=true;status.textContent='Saving securely…';
    try{
      const question=formQuestion(root);
      const method=editingId?'PATCH':'POST';
      const body=editingId?{id:editingId,question}:{question};
      await requestAdmin(method,body);
      status.textContent=question.status==='published'?'Published securely.':'Draft saved securely.';
      resetForm(root);
      await loadQuestions(root,{quiet:true});
      window.dispatchEvent(new CustomEvent('finalforge-question-bank-refresh'));
      window.toast?.(question.status==='published'?'Question published':'Draft saved');
    }catch(error){status.textContent=error?.message||'Save failed.'}
    finally{requestBusy=false;button.disabled=false}
  }

  async function deleteQuestion(root,id){
    const item=questions.find(question=>question.id===id);if(!item)return;
    if(!confirm(`Delete this ${item.status} question? This cannot be undone.`))return;
    if(requestBusy)return;requestBusy=true;
    try{
      await requestAdmin('DELETE',{id});
      if(editingId===id)resetForm(root);
      questions=questions.filter(question=>question.id!==id);render(root);
      window.dispatchEvent(new CustomEvent('finalforge-question-bank-refresh'));
      window.toast?.('Question deleted');
    }catch(error){window.toast?.(error?.message||'Delete failed.')}
    finally{requestBusy=false}
  }

  function bind(root){
    $('[data-v11-form]',root)?.addEventListener('submit',event=>void saveQuestion(root,event));
    $('[data-v11-reset]',root)?.addEventListener('click',()=>resetForm(root));
    $('[data-v11-refresh]',root)?.addEventListener('click',()=>void loadQuestions(root));
    $('[data-v11-filter-module]',root)?.addEventListener('change',()=>renderList(root));
    $('[data-v11-filter-status]',root)?.addEventListener('change',()=>renderList(root));
    $('[data-v11-search]',root)?.addEventListener('input',()=>renderList(root));
    $('[name="kind"]',root)?.addEventListener('change',event=>setKindFields(root,event.target.value));
    root.addEventListener('click',event=>{
      const edit=event.target.closest('[data-v11-edit]');if(edit){populateForm(root,questions.find(item=>item.id===edit.dataset.v11Edit));return}
      const remove=event.target.closest('[data-v11-delete]');if(remove)void deleteQuestion(root,remove.dataset.v11Delete);
    });
  }

  async function mountForAdmin(user){
    const approved=await verifiedAdmin(user);
    if(!approved){clearAdminSurface();return false}
    activeAdminUid=approved.uid;ensureAdminNav();
    const root=ensureSection();render(root);await loadQuestions(root,{quiet:true});return true;
  }

  function bindAuth(){
    const instance=auth();if(!instance?.onAuthStateChanged)return false;
    instance.onAuthStateChanged(user=>{
      if(!user){clearAdminSurface();return}
      if(user.uid===activeAdminUid&&$('#ffV11AdminStudio'))return;
      void mountForAdmin(user);
    });
    return true;
  }

  addEventListener('finalforge-ready',()=>{if(!bindAuth())setTimeout(bindAuth,120)},{once:true});
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='admin'&&activeAdminUid){const root=$('#ffV11AdminStudio');if(root)render(root)}});

  window.FinalForgeAdminQuestionStudio=Object.freeze({mountForAdmin,renderAnalytics:()=>{const root=$('#ffV11AdminStudio');if(root)renderAnalytics(root)}});
})();