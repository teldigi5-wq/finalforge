/* FinalForge Auth World v1 — visual hooks around existing auth state; no auth calls. */
(() => {
  const gate=document.getElementById('authGate');
  const shell=gate?.querySelector('.auth-shell');
  const brand=gate?.querySelector('.auth-brand-panel');
  const card=gate?.querySelector('.auth-card');
  if(!gate||!shell||!brand||!card)return;

  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer=matchMedia('(hover:hover) and (pointer:fine)').matches;
  let attempted=false;
  let activeSubmit=null;

  const aurora=document.createElement('div');
  aurora.className='ff-auth-aurora';
  aurora.setAttribute('aria-hidden','true');
  aurora.innerHTML='<i></i><i></i>';
  shell.prepend(aurora);

  const photo=document.createElement('div');
  photo.className='ff-auth-photo';
  photo.setAttribute('aria-hidden','true');
  brand.prepend(photo);

  const border=document.createElement('div');
  border.className='ff-auth-card-border';
  border.setAttribute('aria-hidden','true');
  card.prepend(border);

  function installSlider(container){
    if(!container||container.querySelector('.ff-auth-slider'))return;
    const slider=document.createElement('i');
    slider.className='ff-auth-slider';
    slider.setAttribute('aria-hidden','true');
    container.prepend(slider);
    const sync=()=>slider.classList.toggle('is-second',container.querySelectorAll(':scope > button')[1]?.classList.contains('active'));
    new MutationObserver(sync).observe(container,{subtree:true,attributes:true,attributeFilter:['class']});
    sync();
  }
  installSlider(gate.querySelector('.auth-tabs'));
  installSlider(gate.querySelector('.auth-role-toggle'));

  function decorateEye(button){
    const input=button.closest('.password-wrap')?.querySelector('input');
    if(!input)return;
    button.innerHTML='<span class="ff-eye" aria-hidden="true"><svg class="ff-eye-open" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg><svg class="ff-eye-closed" viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 4-.8"/></svg></span>';
    const visible=input.type==='text';
    button.classList.toggle('is-visible',visible);
    button.setAttribute('aria-label',visible?'Hide password':'Show password');
  }
  function syncEyes(){gate.querySelectorAll('.password-wrap button').forEach(decorateEye)}
  syncEyes();
  gate.addEventListener('click',e=>{if(e.target.closest('.password-wrap button'))requestAnimationFrame(syncEyes)});

  function decorateSubmit(button){
    if(!button||button.querySelector('.ff-submit-label'))return;
    const label=button.textContent.trim();
    button.innerHTML=`<span class="ff-submit-label">${label}</span><span class="ff-submit-feedback" aria-hidden="true"><svg class="ff-submit-check" viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg><span class="ff-auth-particles"><i></i><i></i><i></i><i></i></span></span>`;
  }
  gate.querySelectorAll('.auth-submit').forEach(decorateSubmit);

  gate.addEventListener('submit',e=>{
    attempted=true;
    activeSubmit=e.target.querySelector('.auth-submit');
    activeSubmit?.classList.remove('is-success');
  });
  gate.querySelector('#verifyCheckBtn')?.addEventListener('click',e=>{attempted=true;activeSubmit=e.currentTarget;activeSubmit.classList.remove('is-success')});

  function playFailure(){
    if(!attempted||gate.classList.contains('ff-auth-success'))return;
    attempted=false;
    activeSubmit?.classList.remove('is-success');
    card.classList.remove('ff-auth-failure');
    void card.offsetWidth;
    card.classList.add('ff-auth-failure');
    setTimeout(()=>card.classList.remove('ff-auth-failure'),340);
  }
  const alert=gate.querySelector('#authAlert');
  if(alert){
    const syncAlert=()=>{if(!alert.hidden&&alert.classList.contains('error')&&alert.textContent.trim())playFailure()};
    new MutationObserver(syncAlert).observe(alert,{attributes:true,childList:true,characterData:true,subtree:true});
  }

  function playSuccess(){
    if(!attempted||reduced)return;
    attempted=false;
    activeSubmit?.classList.add('is-success');
    gate.classList.add('ff-auth-success');
    setTimeout(()=>gate.classList.add('ff-auth-card-exit'),620);
    setTimeout(()=>gate.classList.add('ff-auth-gate-exit'),870);
    setTimeout(()=>gate.classList.remove('ff-auth-success','ff-auth-card-exit','ff-auth-gate-exit'),1120);
  }
  new MutationObserver(()=>{if(!document.body.classList.contains('auth-pending')&&gate.hidden)playSuccess()}).observe(document.body,{attributes:true,attributeFilter:['class']});

  if(!reduced&&finePointer){
    let raf=0,px=0,py=0;
    gate.addEventListener('pointermove',e=>{
      const r=shell.getBoundingClientRect();
      px=Math.max(-8,Math.min(8,((e.clientX-r.left)/r.width-.5)*16));
      py=Math.max(-7,Math.min(7,((e.clientY-r.top)/r.height-.5)*14));
      if(raf)return;
      raf=requestAnimationFrame(()=>{photo.style.setProperty('--ff-photo-x',`${px.toFixed(2)}px`);photo.style.setProperty('--ff-photo-y',`${py.toFixed(2)}px`);raf=0});
    },{passive:true});
    gate.addEventListener('pointerleave',()=>{photo.style.setProperty('--ff-photo-x','0px');photo.style.setProperty('--ff-photo-y','0px')},{passive:true});
  }

  document.body.classList.add('ff-auth-polish-ready');
})();
