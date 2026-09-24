/* FinalForge Auth Premium v6 — presentation-only DOM refinement; auth logic unchanged. */
(()=>{
  const gate=document.getElementById('authGate');
  if(!gate)return;
  const brand=gate.querySelector('.auth-brand-panel');
  const card=gate.querySelector('.auth-card');
  if(!brand||!card)return;

  const svg=(paths,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons={
    check:'<path d="m5 12 4 4L19 6"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    cloud:'<path d="M17.5 19H7a5 5 0 1 1 1.9-9.6A6 6 0 0 1 20 12a3.5 3.5 0 0 1-2.5 7Z"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };

  /* Remove the previous decorative dashboard mockup. It competed with the actual auth flow. */
  brand.querySelector('.ff-auth-preview')?.remove();

  if(!brand.querySelector('.ff-auth-brandbar')){
    const bar=document.createElement('div');
    bar.className='ff-auth-brandbar';
    bar.innerHTML=`<div class="ff-auth-brandlockup"><img src="assets/finalforge-logo-256.webp" alt="FinalForge"><span>FinalForge</span></div><div class="ff-auth-help"><i></i><span>Secure access online</span></div>`;
    brand.prepend(bar);
  }

  if(!brand.querySelector('.ff-auth-brandcontent')){
    const wrap=document.createElement('div');
    wrap.className='ff-auth-brandcontent';
    const headline=brand.querySelector('h1');
    const para=[...brand.children].find(x=>x.tagName==='P');
    const points=brand.querySelector('.auth-points');
    [headline,para,points].filter(Boolean).forEach(el=>wrap.appendChild(el));
    brand.querySelector('.ff-auth-brandbar')?.insertAdjacentElement('afterend',wrap);
  }

  brand.querySelectorAll('.auth-points span').forEach((el,i)=>{
    const label=(el.textContent||'').replace(/^\s*✓\s*/,'').trim();
    const icon=[icons.shield,icons.mail,icons.cloud,icons.lock][i]||icons.check;
    el.innerHTML=`${svg(icon)}<span>${label}</span>`;
  });

  if(!brand.querySelector('.ff-auth-foot')){
    const foot=document.createElement('div');
    foot.className='ff-auth-foot';
    foot.innerHTML='<span><strong>Focused revision.</strong> Fast, private, student-first.</span><span>Forge Your Academic Edge.</span>';
    brand.appendChild(foot);
  }

  if(!card.querySelector('.ff-auth-security')){
    const security=document.createElement('div');
    security.className='ff-auth-security';
    security.innerHTML=`${svg(icons.shield)}<span>Verified through your SLIIT mailbox.</span>`;
    card.appendChild(security);
  }

  const intro=card.querySelector('.ff-auth-intro');
  if(intro){
    const copy={
      login:['Secure student access','Welcome back','Continue exactly where you left off.'],
      signup:['Approved students only','Create your account','One secure account for resources, practice and progress.'],
      verify:['Email verification','Check your SLIIT inbox','Open the verification link, then return here.'],
      reset:['Account recovery','Reset your password','We will send the reset link to your SLIIT mailbox.']
    };
    const syncCopy=()=>{
      const mode=card.dataset.mode||'login';
      const [eyebrow,title,text]=copy[mode]||copy.login;
      const e=intro.querySelector('.ff-auth-eyebrow'),h=intro.querySelector('h2'),p=intro.querySelector('p');
      if(e)e.textContent=eyebrow;if(h)h.textContent=title;if(p)p.textContent=text;
    };
    new MutationObserver(syncCopy).observe(card,{attributes:true,attributeFilter:['data-mode']});
    syncCopy();
  }

  document.documentElement.classList.add('ff-auth-premium-v6');
})();
