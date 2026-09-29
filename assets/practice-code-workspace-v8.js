/* FinalForge Java Workspace v8 — comfortable code editing, line numbers, syntax preview and safe compiler handoff. */
(()=>{
  'use strict';
  if(window.FINALFORGE_CODE_WORKSPACE_V8)return;
  window.FINALFORGE_CODE_WORKSPACE_V8=Object.freeze({version:'8.0.0',mode:'java-workspace'});

  const ACTIVE_KEY='finalforge_exam_v4_active';
  const STDIN_PREFIX='finalforge_java_stdin_v1';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const JAVA_KEYWORDS=new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while record sealed permits non-sealed var'.split(' '));
  const JAVA_LITERALS=new Set(['true','false','null']);
  let queued=0;

  function activeExam(){return readJSON(ACTIVE_KEY,null)}
  function currentQuestion(state=activeExam()){
    if(!state||!Array.isArray(state.questions))return null;
    return state.questions[Math.max(0,Math.min(state.questions.length-1,Number(state.current)||0))]||null;
  }
  function stdinKey(state,question){return `${STDIN_PREFIX}:${String(state?.id||'exam')}:${String(question?.id||'question')}`}

  function highlightJava(source=''){
    const token=/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b/g;
    let html='',last=0,match;
    while((match=token.exec(String(source)))){
      html+=esc(String(source).slice(last,match.index));
      const value=match[0];
      let cls='';
      if(value.startsWith('//')||value.startsWith('/*'))cls='comment';
      else if(value.startsWith('"')||value.startsWith("'"))cls='string';
      else if(/^\d/.test(value))cls='number';
      else if(JAVA_KEYWORDS.has(value))cls='keyword';
      else if(JAVA_LITERALS.has(value))cls='literal';
      html+=cls?`<span class="ff-v8-token-${cls}">${esc(value)}</span>`:esc(value);
      last=match.index+value.length;
    }
    return html+esc(String(source).slice(last));
  }

  function setText(area,text,start=null,end=null){
    area.value=text;
    const point=start===null?text.length:start;
    area.selectionStart=point;area.selectionEnd=end===null?point:end;
    area.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function insertText(area,text){
    const start=area.selectionStart,end=area.selectionEnd,value=area.value;
    setText(area,value.slice(0,start)+text+value.slice(end),start+text.length);
  }

  function indentBlock(area,outdent=false){
    const value=area.value,start=area.selectionStart,end=area.selectionEnd;
    const blockStart=value.lastIndexOf('\n',Math.max(0,start-1))+1;
    let blockEnd=value.indexOf('\n',end);if(blockEnd<0)blockEnd=value.length;
    const original=value.slice(blockStart,blockEnd);
    const lines=original.split('\n');
    const changed=lines.map(line=>outdent?line.replace(/^ {1,4}/,''):`    ${line}`).join('\n');
    const firstDelta=changed.length-original.length;
    const next=value.slice(0,blockStart)+changed+value.slice(blockEnd);
    setText(area,next,blockStart,Math.max(blockStart,blockEnd+firstDelta));
  }

  function autoIndent(area){
    const start=area.selectionStart,end=area.selectionEnd,value=area.value;
    const before=value.slice(0,start),after=value.slice(end);
    const line=before.slice(before.lastIndexOf('\n')+1);
    const indent=(line.match(/^\s*/)||[''])[0];
    const opens=line.trimEnd().endsWith('{');
    const closes=/^\s*}/.test(after);
    if(opens&&closes){
      const middle=`\n${indent}    \n${indent}`;
      const next=before+middle+after;
      setText(area,next,before.length+1+indent.length+4);
      return;
    }
    insertText(area,`\n${indent}${opens?'    ':''}`);
  }

  function updateEditor(root,area){
    const gutter=$('[data-v8-lines]',root),metric=$('[data-v8-metrics]',root),preview=$('[data-v8-preview]',root);
    const lines=Math.max(1,area.value.split('\n').length);
    if(gutter){
      const next=Array.from({length:lines},(_,index)=>index+1).join('\n');
      if(gutter.textContent!==next)gutter.textContent=next;
      gutter.scrollTop=area.scrollTop;
    }
    if(metric)metric.textContent=`${lines} line${lines===1?'':'s'} · ${area.value.length} chars`;
    if(preview&&!preview.hidden)preview.innerHTML=highlightJava(area.value)||'<span class="ff-v8-preview-empty">Start typing to preview Java syntax.</span>';
  }

  async function copyText(text,label='Copied'){
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(String(text));
      else{
        const helper=document.createElement('textarea');helper.value=String(text);helper.setAttribute('readonly','');helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();document.execCommand('copy');helper.remove();
      }
      if(typeof window.toast==='function')window.toast(label);
      return true;
    }catch{
      if(typeof window.toast==='function')window.toast('Copy failed. Select the text manually.');
      return false;
    }
  }

  function queueCompilerPolish(){
    [0,80,220,500].forEach(delay=>setTimeout(polishCompiler,delay));
  }

  function polishCompiler(){
    const mount=$('#ffCompilerMount');if(!mount||mount.hidden)return;
    mount.classList.add('ff-v8-compiler-live');
    const controls=$('.ff-v5-compiler-controls',mount);
    if(controls&&!$('[data-v8-compiler-note]',controls)){
      const note=document.createElement('small');note.dataset.v8CompilerNote='1';note.textContent='External practice sandbox · output appears inside the compiler below';
      controls.firstElementChild?.appendChild(note);
    }
    const frame=$('iframe',mount);if(frame)frame.setAttribute('aria-label','Java compiler and output console');
  }

  function enhance(){
    const area=$('#examWritten.ff-v5-native-code');
    const workspace=area?.closest('.ff-v5-code-workspace');
    if(!area||!workspace||workspace.dataset.ffCodeV8==='1')return false;
    const state=activeExam(),question=currentQuestion(state);
    if(!state||!question||question.kind!=='code')return false;

    workspace.dataset.ffCodeV8='1';
    workspace.classList.add('ff-v8-code-workspace');
    area.classList.add('ff-v8-editor');
    area.setAttribute('aria-label','Java answer editor');
    area.setAttribute('wrap','off');

    const nativeHead=$('.ff-v5-code-head',workspace);
    const nativeCompiler=$('[data-compiler-open]',workspace);
    if(nativeCompiler){nativeCompiler.textContent='Open compiler';nativeCompiler.classList.add('ff-v8-open-compiler')}

    const shell=document.createElement('section');shell.className='ff-v8-shell';shell.setAttribute('aria-label','Java coding workspace');
    shell.innerHTML=`
      <div class="ff-v8-filebar"><div><span class="ff-v8-file-dot"></span><b>Main.java</b><small>Java practice answer</small></div><div class="ff-v8-badges"><span>Java 21</span><span>Autosave</span></div></div>
      <div class="ff-v8-toolbar" role="toolbar" aria-label="Code editor tools">
        <button class="btn" type="button" data-v8-reset>Reset starter</button>
        <button class="btn" type="button" data-v8-copy>Copy code</button>
        <button class="btn" type="button" data-v8-syntax aria-pressed="false">Syntax preview</button>
      </div>
      <div class="ff-v8-editor-frame"><pre class="ff-v8-gutter" data-v8-lines aria-hidden="true"></pre></div>
      <div class="ff-v8-statusbar"><span data-v8-metrics>1 line · 0 chars</span><span>Tab = indent · Ctrl/⌘ + Enter = compiler</span></div>
      <pre class="ff-v8-syntax-preview" data-v8-preview hidden aria-label="Syntax highlighted Java preview"></pre>
      <div class="ff-v8-stdin">
        <div class="ff-v8-stdin-head"><div><b>Test input</b><span>Optional STDIN for practice</span></div><button class="btn" type="button" data-v8-copy-stdin>Copy input</button></div>
        <textarea data-v8-stdin-input spellcheck="false" autocomplete="off" placeholder="Example:\n5\nDeposit\n2500"></textarea>
        <p>This test input is stored only in your account-scoped browser study data. Open the compiler and paste it into its I/O → STDIN area.</p>
      </div>`;

    const frame=$('.ff-v8-editor-frame',shell);frame.appendChild(area);
    if(nativeHead)nativeHead.insertAdjacentElement('afterend',shell);else workspace.prepend(shell);

    const stdin=$('[data-v8-stdin-input]',shell);
    try{stdin.value=localStorage.getItem(stdinKey(state,question))||''}catch{}

    area.addEventListener('input',()=>updateEditor(shell,area));
    area.addEventListener('scroll',()=>{const gutter=$('[data-v8-lines]',shell);if(gutter)gutter.scrollTop=area.scrollTop},{passive:true});
    area.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){
        event.preventDefault();nativeCompiler?.click();queueCompilerPolish();return;
      }
      if(event.key==='Tab'){
        event.preventDefault();
        if(event.shiftKey||area.selectionStart!==area.selectionEnd)indentBlock(area,event.shiftKey);
        else insertText(area,'    ');
        return;
      }
      if(event.key==='Enter'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();autoIndent(area)}
    });

    $('[data-v8-reset]',shell)?.addEventListener('click',()=>{
      const starter=String(question.starter||'');
      if(area.value!==starter&&!confirm('Reset this Java answer to the starter code?'))return;
      setText(area,starter,starter.length);area.focus();
    });
    $('[data-v8-copy]',shell)?.addEventListener('click',()=>copyText(area.value,'Java code copied'));
    $('[data-v8-syntax]',shell)?.addEventListener('click',event=>{
      const preview=$('[data-v8-preview]',shell);if(!preview)return;
      preview.hidden=!preview.hidden;event.currentTarget.setAttribute('aria-pressed',String(!preview.hidden));event.currentTarget.textContent=preview.hidden?'Syntax preview':'Hide preview';updateEditor(shell,area);
      if(!preview.hidden)preview.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    stdin?.addEventListener('input',()=>{try{localStorage.setItem(stdinKey(state,question),stdin.value)}catch{}});
    $('[data-v8-copy-stdin]',shell)?.addEventListener('click',()=>copyText(stdin?.value||'','Test input copied'));

    updateEditor(shell,area);
    return true;
  }

  function queueEnhance(){
    const token=++queued;
    [0,40,120,280,520].forEach(delay=>setTimeout(()=>{if(token===queued)enhance()},delay));
  }

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('[data-start-mode],[data-resume-exam],[data-exam-next],[data-exam-prev],[data-question-index],[data-compiler-open]');
    if(!target)return;
    if(target.matches('[data-compiler-open]'))queueCompilerPolish();
    queueEnhance();
  });
  document.addEventListener('focusin',event=>{if(event.target?.matches?.('#examWritten.ff-v5-native-code'))queueEnhance()});
  document.addEventListener('keydown',event=>{if(event.altKey&&(event.key==='ArrowRight'||event.key==='ArrowLeft'))queueEnhance()});
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='practice')queueEnhance()});
  addEventListener('finalforge-ready',queueEnhance,{once:true});
  addEventListener('pageshow',queueEnhance,{passive:true});

  window.FinalForgeCodeWorkspace={enhance,highlightJava};
  queueEnhance();
})();