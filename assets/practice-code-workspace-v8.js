/* FinalForge Java Workspace v8 — comfortable code editing, line numbers, syntax preview, self-checks and safe compiler handoff. */
(()=>{
  'use strict';
  if(window.FINALFORGE_CODE_WORKSPACE_V8)return;
  window.FINALFORGE_CODE_WORKSPACE_V8=Object.freeze({version:'8.1.0',mode:'java-workspace'});

  const ACTIVE_KEY='finalforge_exam_v4_active';
  const STDIN_PREFIX='finalforge_java_stdin_v1';
  const WORKSPACE_PREFIX='finalforge_java_workspace_v2';
  const $=(selector,root=document)=>root.querySelector(selector);
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const JAVA_KEYWORDS=new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while record sealed permits non-sealed var'.split(' '));
  const JAVA_LITERALS=new Set(['true','false','null']);
  let queued=0;
  let saveEcho=0;

  function activeExam(){return readJSON(ACTIVE_KEY,null)}
  function currentQuestion(state=activeExam()){
    if(!state||!Array.isArray(state.questions))return null;
    return state.questions[Math.max(0,Math.min(state.questions.length-1,Number(state.current)||0))]||null;
  }
  function stdinKey(state,question){return `${STDIN_PREFIX}:${String(state?.id||'exam')}:${String(question?.id||'question')}`}
  function workspaceKey(state,question){return `${WORKSPACE_PREFIX}:${String(state?.id||'exam')}:${String(question?.id||'question')}`}
  function readWorkspace(state,question){
    const fallback={stdin:'',output:'',rubric:[],updatedAt:0};
    const stored=readJSON(workspaceKey(state,question),fallback);
    if(!stored||typeof stored!=='object')return fallback;
    let legacy='';
    try{legacy=localStorage.getItem(stdinKey(state,question))||''}catch{}
    return {
      stdin:typeof stored.stdin==='string'?stored.stdin:legacy,
      output:typeof stored.output==='string'?stored.output:'',
      rubric:Array.isArray(stored.rubric)?stored.rubric.map(Boolean):[],
      updatedAt:Number(stored.updatedAt)||0
    };
  }
  function writeWorkspace(state,question,next){
    try{
      localStorage.setItem(workspaceKey(state,question),JSON.stringify({...next,updatedAt:Date.now()}));
      return true;
    }catch{return false}
  }

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
    const delta=changed.length-original.length;
    const next=value.slice(0,blockStart)+changed+value.slice(blockEnd);
    setText(area,next,blockStart,Math.max(blockStart,blockEnd+delta));
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

  function cursorPosition(area){
    const index=Math.max(0,Number(area.selectionStart)||0);
    const before=area.value.slice(0,index);
    const line=before.split('\n').length;
    const lastBreak=before.lastIndexOf('\n');
    return {line,column:index-(lastBreak+1)+1};
  }

  function updateEditor(root,area){
    const gutter=$('[data-v8-lines]',root),metric=$('[data-v8-metrics]',root),preview=$('[data-v8-preview]',root);
    const lines=Math.max(1,area.value.split('\n').length);
    if(gutter){
      const next=Array.from({length:lines},(_,index)=>index+1).join('\n');
      if(gutter.textContent!==next)gutter.textContent=next;
      gutter.scrollTop=area.scrollTop;
    }
    if(metric){
      const cursor=cursorPosition(area);
      metric.textContent=`Ln ${cursor.line}, Col ${cursor.column} · ${lines} line${lines===1?'':'s'} · ${area.value.length} chars`;
    }
    if(preview&&!preview.hidden)preview.innerHTML=highlightJava(area.value)||'<span class="ff-v8-preview-empty">Start typing to preview Java syntax.</span>';
  }

  function mirrorSaveState(root,area){
    const badge=$('[data-v8-save]',root);if(!badge)return;
    badge.textContent='Saving with attempt…';
    clearTimeout(saveEcho);
    saveEcho=setTimeout(()=>{
      const native=$('#ffExamSave span')?.textContent?.trim();
      badge.textContent=native==='Saved'?'Saved with attempt':native||'Autosave active';
      updateEditor(root,area);
    },320);
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
      const note=document.createElement('small');note.dataset.v8CompilerNote='1';note.textContent='External OneCompiler sandbox · execution happens outside FinalForge';
      controls.firstElementChild?.appendChild(note);
    }
    const frame=$('iframe',mount);if(frame)frame.setAttribute('aria-label','External OneCompiler Java editor and output console');
  }

  function rubricPoints(question){
    const points=Array.isArray(question?.p)?question.p.map(point=>String(point||'').trim()).filter(Boolean):[];
    if(points.length)return points;
    return [
      'Match the required Java program structure and requested logic.',
      'Check input handling and output formatting against the question.',
      'Test the important conditions or edge cases in an external compiler.',
      'Read the complete solution once more before submitting the practice answer.'
    ];
  }

  function rubricHTML(points,checks){
    return points.map((point,index)=>`<label class="ff-v8-rubric-item"><input type="checkbox" data-v8-rubric-index="${index}" ${checks[index]?'checked':''}><span><i aria-hidden="true"></i>${esc(point)}</span></label>`).join('');
  }

  function updateRubricScore(root,points){
    const score=$('[data-v8-rubric-score]',root);if(!score)return;
    const checked=root.querySelectorAll('[data-v8-rubric-index]:checked').length;
    score.textContent=`${checked} / ${points.length} checked · self-review only`;
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
    if(nativeCompiler){nativeCompiler.textContent='Open external compiler';nativeCompiler.classList.add('ff-v8-open-compiler')}

    const meta=readWorkspace(state,question);
    const points=rubricPoints(question);
    const checks=points.map((_,index)=>Boolean(meta.rubric[index]));
    const shell=document.createElement('section');shell.className='ff-v8-shell';shell.setAttribute('aria-label','Java coding workspace');
    shell.innerHTML=`
      <div class="ff-v8-filebar">
        <div><span class="ff-v8-file-dot"></span><b>Main.java</b><small>Java practice answer</small></div>
        <div class="ff-v8-badges"><span>Java</span><span data-v8-save aria-live="polite">Autosave active</span></div>
      </div>
      <div class="ff-v8-toolbar" role="toolbar" aria-label="Code editor tools">
        <button class="btn" type="button" data-v8-reset>Reset code</button>
        <button class="btn" type="button" data-v8-copy>Copy code</button>
        <button class="btn" type="button" data-v8-syntax aria-pressed="false">Syntax preview</button>
        <button class="btn ff-v8-run-external" type="button" data-v8-open>Open compiler</button>
      </div>
      <div class="ff-v8-editor-frame"><pre class="ff-v8-gutter" data-v8-lines aria-hidden="true"></pre></div>
      <div class="ff-v8-statusbar"><span data-v8-metrics>Ln 1, Col 1 · 1 line · 0 chars</span><span>Tab = indent · Ctrl/⌘ + Enter = external compiler</span></div>
      <pre class="ff-v8-syntax-preview" data-v8-preview hidden aria-label="Syntax highlighted Java preview"></pre>
      <div class="ff-v8-practice-tools">
        <section class="ff-v8-io-card" aria-labelledby="ffV8IoTitle">
          <div class="ff-v8-tool-head"><div><b id="ffV8IoTitle">Test I/O notebook</b><span>Keep practice inputs and observed results beside your code</span></div></div>
          <div class="ff-v8-io-grid">
            <label><span>STDIN</span><textarea data-v8-stdin-input spellcheck="false" autocomplete="off" placeholder="Example:\n5\nDeposit\n2500"></textarea></label>
            <label><span>Observed output / compiler errors</span><textarea data-v8-output-input spellcheck="false" autocomplete="off" placeholder="Paste the output or error message you observed in the external compiler…"></textarea></label>
          </div>
          <div class="ff-v8-io-actions">
            <button class="btn" type="button" data-v8-copy-stdin>Copy STDIN</button>
            <button class="btn" type="button" data-v8-copy-output>Copy output</button>
            <button class="btn" type="button" data-v8-copy-open>Copy STDIN & open compiler</button>
          </div>
          <p><b>External execution:</b> OneCompiler runs the program outside FinalForge. FinalForge does not securely execute or grade Java code, and it does not automatically treat external console output as a verified result.</p>
        </section>
        <section class="ff-v8-rubric" aria-labelledby="ffV8RubricTitle">
          <div class="ff-v8-tool-head"><div><b id="ffV8RubricTitle">Self-check rubric</b><span>Use this before moving to the next question</span></div><strong data-v8-rubric-score aria-live="polite">0 / ${points.length} checked · self-review only</strong></div>
          <div class="ff-v8-rubric-list">${rubricHTML(points,checks)}</div>
          <p>These checks are study guidance only. They are not an awarded mark and do not prove that the program compiles or produces the required output.</p>
        </section>
      </div>`;

    const frame=$('.ff-v8-editor-frame',shell);frame.appendChild(area);
    if(nativeHead)nativeHead.insertAdjacentElement('afterend',shell);else workspace.prepend(shell);

    const stdin=$('[data-v8-stdin-input]',shell),output=$('[data-v8-output-input]',shell);
    stdin.value=meta.stdin||'';output.value=meta.output||'';
    try{if(!stdin.value)stdin.value=localStorage.getItem(stdinKey(state,question))||''}catch{}

    const persistTools=()=>{
      const next={
        stdin:stdin?.value||'',
        output:output?.value||'',
        rubric:points.map((_,index)=>Boolean($(`[data-v8-rubric-index="${index}"]`,shell)?.checked)),
        updatedAt:Date.now()
      };
      writeWorkspace(state,question,next);
    };

    area.addEventListener('input',()=>{updateEditor(shell,area);mirrorSaveState(shell,area)});
    area.addEventListener('scroll',()=>{const gutter=$('[data-v8-lines]',shell);if(gutter)gutter.scrollTop=area.scrollTop},{passive:true});
    ['click','keyup','select'].forEach(type=>area.addEventListener(type,()=>updateEditor(shell,area)));
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
    $('[data-v8-open]',shell)?.addEventListener('click',()=>{nativeCompiler?.click();queueCompilerPolish()});

    stdin?.addEventListener('input',()=>{
      try{localStorage.setItem(stdinKey(state,question),stdin.value)}catch{}
      persistTools();
    });
    output?.addEventListener('input',persistTools);
    shell.querySelectorAll('[data-v8-rubric-index]').forEach(box=>box.addEventListener('change',()=>{persistTools();updateRubricScore(shell,points)}));
    $('[data-v8-copy-stdin]',shell)?.addEventListener('click',()=>copyText(stdin?.value||'','STDIN copied'));
    $('[data-v8-copy-output]',shell)?.addEventListener('click',()=>copyText(output?.value||'','Observed output copied'));
    $('[data-v8-copy-open]',shell)?.addEventListener('click',async()=>{
      if(stdin?.value)await copyText(stdin.value,'STDIN copied — paste it into OneCompiler I/O → STDIN');
      nativeCompiler?.click();queueCompilerPolish();
    });

    updateEditor(shell,area);updateRubricScore(shell,points);persistTools();
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