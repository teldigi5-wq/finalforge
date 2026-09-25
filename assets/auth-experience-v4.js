/* FinalForge Auth Experience v4 — light interaction polish, no heavy 3D transforms */
(()=>{
  const gate=document.getElementById('authGate');
  const card=gate?.querySelector('.auth-card');
  const tabs=gate?.querySelector('.auth-tabs');
  if(!gate||!card||!tabs)return;

  const intro=card.querySelector('.ff-auth-intro')||document.createElement('div');
  intro.className='ff-auth-intro';
  if(!intro.children.length)intro.innerHTML='<div class="ff-auth-eyebrow">Secure student access</div><h2>Welcome back</h2><p>Continue exactly where you left off.</p>';
  if(!intro.isConnected)tabs.before(intro);

  const copy={
    login:{eyebrow:'Secure student access',title:'Welcome back',text:'Continue exactly where you left off.'},
    signup:{eyebrow:'Approved students only',title:'Create your FinalForge account',text:'Use your Student ID. Your SLIIT mailbox is generated automatically for verification.'},
    verify:{eyebrow:'One last step',title:'Verify your SLIIT email',text:'Open the verification link in your SLIIT inbox, then return here.'},
    reset:{eyebrow:'Account recovery',title:'Reset your password',text:'We will send the reset link to the SLIIT mailbox tied to your Student ID.'}
  };

  function currentMode(){
    if(document.getElementById('signupForm')?.classList.contains('active'))return 'signup';
    if(document.getElementById('verifyForm')?.classList.contains('active'))return 'verify';
    if(document.getElementById('resetForm')?.classList.contains('active'))return 'reset';
    return 'login';
  }

  let lastMode='';
  function sync(){
    const mode=currentMode();
    card.dataset.mode=mode;
    const c=copy[mode];
    intro.querySelector('.ff-auth-eyebrow').textContent=c.eyebrow;
    intro.querySelector('h2').textContent=c.title;
    intro.querySelector('p').textContent=c.text;

    gate.querySelectorAll('.auth-tabs>button').forEach(btn=>{
      const selected=(mode==='login'&&btn.id==='loginTab')||(mode==='signup'&&btn.id==='signupTab');
      btn.setAttribute('aria-selected',String(selected));
    });
    gate.querySelectorAll('.auth-role-toggle>button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.classList.contains('active'))));

    if(lastMode&&mode!==lastMode){
      const active=gate.querySelector('.auth-view.active');
      if(active){
        active.classList.remove('ff-enter');
        void active.offsetWidth;
        active.classList.add('ff-enter');
        setTimeout(()=>active.classList.remove('ff-enter'),260);
      }
    }
    lastMode=mode;
  }

  const observer=new MutationObserver(sync);
  gate.querySelectorAll('.auth-view,.auth-tabs>button,.auth-role-toggle>button').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
  sync();

  /* tactile, lightweight button feedback without layout-shifting 3D tilt */
  gate.addEventListener('pointerdown',e=>{
    const btn=e.target.closest('button');
    if(!btn)return;
    btn.style.setProperty('--ff-press-x',`${e.clientX-btn.getBoundingClientRect().left}px`);
    btn.style.setProperty('--ff-press-y',`${e.clientY-btn.getBoundingClientRect().top}px`);
  },{passive:true});

  /* Show the page as ready without a long reveal animation. */
  document.body.classList.add('ff-auth-ui-ready');
})();
