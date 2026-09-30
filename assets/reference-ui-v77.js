/* FinalForge Reference UI v77 — public/auth presentation only. */
(()=>{
  'use strict';
  if(window.FINALFORGE_REFERENCE_UI_V77)return;
  window.FINALFORGE_REFERENCE_UI_V77=Object.freeze({version:'77.0.0',mode:'exact-public-auth-reference'});

  const root=document.documentElement;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  root.classList.add('ff-reference-ui-v77');

  const icon=(name)=>({
    resources:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h10l4 4V20.5H5z"/><path d="M15 3.5v5h5M8.5 12h7M8.5 15.5h5"/></svg>',
    practice:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.4"/><path d="M12 6.5v2M17.5 12h-2M12 17.5v-2M6.5 12h2"/></svg>',
    planner:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M7.5 11h3M13.5 11h3M7.5 15h3"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
    play:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg>',
    shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6z"/><path d="m9.5 12 1.6 1.6 3.7-4"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>'
  }[name]||'');

  function ensureLanding(){
    const gate=$('#authGate');
    if(!gate||$('#ffPublicLanding'))return;
    const landing=document.createElement('section');
    landing.id='ffPublicLanding';
    landing.className='ff-v77-landing';
    landing.hidden=true;
    landing.innerHTML=`
      <div class="ff-v77-landing-shell">
        <header class="ff-v77-public-nav">
          <button class="ff-v77-wordmark" type="button" data-v77-home aria-label="FinalForge home">
            <img src="assets/finalforge-logo-256.webp" alt=""><b>FinalForge</b>
          </button>
          <nav aria-label="Public navigation">
            <button type="button" data-v77-scroll="features">Features</button>
            <button type="button" data-v77-scroll="modules">Modules</button>
            <button type="button" data-v77-scroll="about">About</button>
          </nav>
          <div class="ff-v77-public-actions">
            <button class="ff-v77-outline" type="button" data-v77-auth="login">Login</button>
            <button class="ff-v77-primary" type="button" data-v77-auth="signup">Get Started</button>
          </div>
        </header>

        <div class="ff-v77-hero" id="about">
          <div class="ff-v77-hero-copy">
            <span class="ff-v77-eyebrow">FOR UNIVERSITY SUCCESS</span>
            <h1>Forge Your<br>Academic <em>Edge.</em></h1>
            <p>Everything you need for your university journey —<br>organized, focused and built for results.</p>

            <div class="ff-v77-feature-grid" id="features">
              <button type="button" data-v77-auth="login"><i>${icon('resources')}</i><span>Study Resources</span></button>
              <button type="button" data-v77-auth="login"><i>${icon('practice')}</i><span>Practice Exams</span></button>
              <button type="button" data-v77-auth="login"><i>${icon('planner')}</i><span>Study Planner</span></button>
              <button type="button" data-v77-auth="login"><i>${icon('progress')}</i><span>Progress Tracking</span></button>
            </div>

            <div class="ff-v77-hero-actions">
              <button class="ff-v77-primary ff-v77-hero-cta" type="button" data-v77-auth="signup">Get Started</button>
              <button class="ff-v77-watch" type="button" data-v77-auth="login">${icon('play')}<span>Watch Preview</span></button>
            </div>
          </div>

          <div class="ff-v77-stats" id="modules">
            <div><strong>4</strong><span>Modules</span></div>
            <div><strong>500+</strong><span>Resources</span></div>
            <div><strong>1000+</strong><span>Practice Questions</span></div>
            <div><strong>24/7</strong><span>Access</span></div>
          </div>
          <blockquote>“Preparation today.<br>A stronger tomorrow.”</blockquote>
        </div>
      </div>`;
    gate.prepend(landing);

    landing.addEventListener('click',event=>{
      const authButton=event.target.closest('[data-v77-auth]');
      if(authButton){showAuth(authButton.dataset.v77Auth);return}
      const scrollButton=event.target.closest('[data-v77-scroll]');
      if(scrollButton){
        const target=$(`#${scrollButton.dataset.v77Scroll}`,landing);
        target?.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
  }

  function ensureAuthBrand(){
    const card=$('#authGate .auth-card');
    if(!card||$('.ff-v77-auth-brand',card))return;
    const brand=document.createElement('button');
    brand.type='button';
    brand.className='ff-v77-auth-brand';
    brand.setAttribute('aria-label','Back to FinalForge home');
    brand.innerHTML='<img src="assets/finalforge-logo-256.webp" alt=""><b>FinalForge</b>';
    brand.addEventListener('click',()=>showLanding());
    card.prepend(brand);
  }

  function ensureLoginDetails(){
    const form=$('#loginForm');
    if(!form)return;
    const remember=$('.ff-remember span',form);
    if(remember)remember.textContent='Remember me';
    const submit=$('.auth-submit',form);
    if(submit&&!submit.dataset.v77Copy){
      submit.dataset.v77Copy='1';
      submit.innerHTML=`<span>Login</span>${icon('arrow')}`;
    }
    const forgot=$('#forgotBtn');
    if(forgot)forgot.textContent='Forgot password?';
    if(!$('.ff-v77-account-switch',form)){
      const row=document.createElement('div');
      row.className='ff-v77-account-switch';
      row.innerHTML='Don\'t have an account? <button type="button">Create account</button>';
      row.querySelector('button').addEventListener('click',()=>showAuth('signup'));
      form.appendChild(row);
    }
  }

  function ensureSignupStructure(){
    const form=$('#signupForm');
    if(!form)return;
    const stepper=$('.auth-stepper',form);
    if(stepper&&!stepper.dataset.v77Steps){
      stepper.dataset.v77Steps='1';
      const rows=[['Account','Enter your Student ID'],['Verify Email','Check your SLIIT inbox'],['Ready','Start your journey']];
      [...stepper.children].forEach((span,index)=>{
        const [title,sub]=rows[index]||['Step','Continue'];
        span.dataset.step=String(index+1);
        span.innerHTML=`<b>${title}</b><small>${sub}</small>`;
      });
    }

    if(!$('.ff-v77-signup-fields',form)){
      const fields=document.createElement('div');
      fields.className='ff-v77-signup-fields';
      [...form.children].filter(child=>child!==stepper).forEach(child=>fields.appendChild(child));
      form.appendChild(fields);
    }

    const fields=$('.ff-v77-signup-fields',form);
    const studentLabel=$('#signupStudentId')?.closest('label');
    const emailLabel=$('#derivedEmail')?.closest('label');
    if(studentLabel)studentLabel.classList.add('ff-v77-student-id-field');
    if(emailLabel)emailLabel.classList.add('ff-v77-email-field');

    const password=$('#signupPassword');
    const strength=$('#signupStrength');
    if(password&&strength&&!$('#ffV77PasswordRules')){
      const rules=document.createElement('div');
      rules.id='ffV77PasswordRules';
      rules.className='ff-v77-password-rules';
      rules.innerHTML=`
        <div class="ff-v77-rule-title">${icon('check')}<b>Password requirements</b></div>
        <span data-rule="length">${icon('check')}At least 8 characters</span>
        <span data-rule="upper">${icon('check')}Include uppercase letter</span>
        <span data-rule="lower">${icon('check')}Include lowercase letter</span>
        <span data-rule="number">${icon('check')}Include a number</span>`;
      strength.after(rules);
      const paint=()=>{
        const value=password.value||'';
        const states={length:value.length>=8,upper:/[A-Z]/.test(value),lower:/[a-z]/.test(value),number:/\d/.test(value)};
        Object.entries(states).forEach(([key,ok])=>rules.querySelector(`[data-rule="${key}"]`)?.classList.toggle('is-met',ok));
        const met=Object.values(states).filter(Boolean).length;
        strength.dataset.v77Level=met===4?'strong':met>=2?'medium':'weak';
        const label=strength.querySelector('span');
        if(label)label.textContent=met===4?'Strong':met>=2?'Medium':'Use a stronger password';
      };
      password.addEventListener('input',paint);
      paint();
    }

    const submit=$('.auth-submit',form);
    if(submit&&!submit.dataset.v77Copy){
      submit.dataset.v77Copy='1';
      submit.innerHTML=`<span>Create Account</span>${icon('arrow')}`;
    }
  }

  function tuneCopy(){
    const card=$('#authGate .auth-card');
    if(!card)return;
    const mode=card.dataset.mode||'login';
    const intro=$('.ff-auth-intro',card);
    const h=intro?.querySelector('h2');
    const p=intro?.querySelector('p');
    if(mode==='login'){
      if(h)h.textContent='Welcome back';
      if(p)p.textContent='Continue your academic journey';
    }else if(mode==='signup'){
      if(h)h.textContent='Create your account';
      if(p)p.textContent='Join SLIIT students preparing smarter';
    }
  }

  function paintMode(){
    const body=document.body;
    const card=$('#authGate .auth-card');
    if(!body||!card)return;
    const mode=card.dataset.mode||'login';
    root.dataset.ffPublicMode=mode;
    const landing=$('#ffPublicLanding');
    const shell=$('#authGate .auth-shell');
    if(body.classList.contains('ff-authenticated')){
      root.classList.remove('ff-v77-public-landing','ff-v77-public-auth');
      if(landing)landing.hidden=true;
      return;
    }
    if(['verify','reset'].includes(mode)){
      root.classList.remove('ff-v77-public-landing');
      root.classList.add('ff-v77-public-auth');
      if(landing)landing.hidden=true;
      if(shell)shell.removeAttribute('aria-hidden');
    }
    tuneCopy();
  }

  function showLanding(){
    if(document.body?.classList.contains('ff-authenticated'))return;
    ensureLanding();
    root.classList.add('ff-v77-public-landing');
    root.classList.remove('ff-v77-public-auth');
    const landing=$('#ffPublicLanding');
    const shell=$('#authGate .auth-shell');
    if(landing)landing.hidden=false;
    if(shell)shell.setAttribute('aria-hidden','true');
    try{history.replaceState(null,'',location.pathname+location.search)}catch{}
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  }

  function showAuth(mode='login'){
    ensureLanding();ensureAuthBrand();ensureLoginDetails();ensureSignupStructure();
    root.classList.remove('ff-v77-public-landing');
    root.classList.add('ff-v77-public-auth');
    const landing=$('#ffPublicLanding');
    const shell=$('#authGate .auth-shell');
    if(landing)landing.hidden=true;
    if(shell)shell.removeAttribute('aria-hidden');
    if(typeof window.showAuthView==='function')window.showAuthView(mode);
    tuneCopy();
    try{history.replaceState(null,'',`#${mode}`)}catch{}
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  }

  window.finalforgeShowPublicLanding=showLanding;
  window.finalforgeShowPublicAuth=showAuth;

  let wasAuthenticated=document.body?.classList.contains('ff-authenticated')||false;
  let initialized=false;
  function refresh(){
    ensureLanding();ensureAuthBrand();ensureLoginDetails();ensureSignupStructure();paintMode();
    const body=document.body;
    const authenticated=body?.classList.contains('ff-authenticated')||false;
    if(authenticated){wasAuthenticated=true;return}
    if(!body?.classList.contains('auth-pending'))return;
    const mode=$('#authGate .auth-card')?.dataset.mode||'login';
    if(['verify','reset'].includes(mode))return;
    if(!initialized){
      initialized=true;
      const hash=location.hash.toLowerCase();
      if(hash==='#login')showAuth('login');
      else if(hash==='#signup')showAuth('signup');
      else showLanding();
    }else if(wasAuthenticated){
      wasAuthenticated=false;
      showLanding();
    }
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh()});
  };

  addEventListener('finalforge-ready',queue);
  addEventListener('pageshow',queue,{passive:true});
  document.addEventListener('DOMContentLoaded',queue,{once:true});
  new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-mode','hidden']});
  queue();
})();
