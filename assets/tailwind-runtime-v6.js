/* FinalForge Tailwind runtime v6 — component classes, SVG icon cleanup, real aggregate trust UI. */
(()=>{
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const iconPaths={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    modules:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    resources:'<path d="M3 6h6l2 2h10v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 6V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/>',
    practice:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m16 8 5-5"/><path d="M16 3h5v5"/>',
    schedule:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    planner:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 11 2 2 4-4M8 7h8M8 17h8"/>',
    roadmap:'<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17c0-5 12-5 12-10"/><path d="m13 7 3-2-3-2"/>',
    admin:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    cloud:'<path d="M17.5 19H7a5 5 0 1 1 1.9-9.6A6 6 0 0 1 20 12a3.5 3.5 0 0 1-2.5 7Z"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:'<path d="m3 3 18 18"/><path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6"/><path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1 0 1.9-.2 2.8-.4"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    chevronDown:'<path d="m6 9 6 6 6-6"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    star:'<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    book:'<path d="M2 4h6a4 4 0 0 1 4 4v12a4 4 0 0 0-4-4H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a4 4 0 0 1 4-4h6Z"/>',
    spark:'<path d="m12 3-1.4 4.1a2 2 0 0 1-1.3 1.3L5 10l4.3 1.6a2 2 0 0 1 1.3 1.3L12 17l1.4-4.1a2 2 0 0 1 1.3-1.3L19 10l-4.3-1.6a2 2 0 0 1-1.3-1.3Z"/>'
  };
  const svg=(name,cls='ff-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`;
  const emoji=/[\p{Extended_Pictographic}\uFE0F\u200D]/u;
  const clean=s=>String(s||'').replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u,'').trim();
  const navIcon=id=>iconPaths[id]?id:'spark';

  function applyComponents(root=document){
    qa('.card',root).forEach(el=>el.classList.add('ff-card','ff-card-hover'));
    qa('.stat',root).forEach(el=>el.classList.add('ff-stat'));
    qa('.btn',root).forEach(el=>{
      el.classList.add('ff-btn');
      if(el.classList.contains('primary'))el.classList.add('ff-btn-primary');
      else if(el.classList.contains('ghost'))el.classList.add('ff-btn-ghost');
      else el.classList.add('ff-btn-secondary');
    });
    qa('input:not([type=checkbox]):not([type=radio]),select,textarea,.search,.track-select',root).forEach(el=>el.classList.add('ff-input'));
    qa('.kicker',root).forEach(el=>el.classList.add('ff-eyebrow'));
    qa('.section-head h2',root).forEach(el=>el.classList.add('ff-section-title'));
  }

  function upgradeNav(root){
    if(!root)return;
    qa('button[data-go]',root).forEach(b=>{
      b.classList.add('ff-nav-item');
      b.classList.toggle('ff-nav-active',b.classList.contains('active'));
      const id=b.dataset.go||'';
      const label=q('span',b)?.textContent||clean(b.textContent);
      if(!q('svg',b))b.innerHTML=`${svg(navIcon(id))}<span>${label}</span>`;
    });
  }

  function iconForText(text){
    const t=String(text||'').toLowerCase();
    if(t.includes('practice')||t.includes('quiz')||t.includes('mock'))return 'practice';
    if(t.includes('resource')||t.includes('download'))return 'resources';
    if(t.includes('roadmap'))return 'roadmap';
    if(t.includes('schedule')||t.includes('timetable'))return 'schedule';
    if(t.includes('planner')||t.includes('study next'))return 'planner';
    if(t.includes('admin')||t.includes('security'))return 'shield';
    if(t.includes('mail')||t.includes('verification'))return 'mail';
    if(t.includes('print')||t.includes('paper')||t.includes('sheet'))return 'file';
    if(t.includes('sync')||t.includes('cloud'))return 'cloud';
    return 'spark';
  }

  function cleanFunctionalEmoji(root=document){
    qa('.quick-dock>button,.hero-actions .btn,.official-link,.mock-tools .btn,.exam-actions .btn',root).forEach(b=>{
      const text=(b.textContent||'').trim();
      if(!emoji.test(text)||q('svg',b))return;
      const label=clean(text);b.innerHTML=`${svg(iconForText(label))}<span>${label}</span>`;
    });
    qa('.module-icon',root).forEach(el=>{if(!q('svg',el))el.innerHTML=svg('book','ff-icon ff-icon-lg')});
    qa('.otp-icon',root).forEach(el=>{if(!q('svg',el))el.innerHTML=svg('mail','ff-icon ff-icon-lg')});
    const sync=q('#syncState',root);if(sync&&emoji.test(sync.textContent||'')){const label=clean(sync.textContent);sync.innerHTML=`${svg('cloud','ff-icon ff-icon-sm')}<span>${label}</span>`;sync.style.display='inline-flex';sync.style.alignItems='center';sync.style.gap='6px'}
    qa('.password-wrap button',root).forEach(b=>{if(!q('svg',b))b.innerHTML=svg('eye')});
    const account=q('#accountChip',root);if(account){const spans=[...account.children].filter(x=>x.tagName==='SPAN');const last=spans[spans.length-1];if(last&&/⌄|▼|▾/.test(last.textContent||''))last.innerHTML=svg('chevronDown','ff-icon ff-icon-sm')}
  }

  function installPasswordOverride(){
    window.togglePassword=(id,b)=>{const x=document.getElementById(id);if(!x)return;x.type=x.type==='password'?'text':'password';b.innerHTML=svg(x.type==='password'?'eye':'eyeOff')};
  }

  async function loadStats(box){
    try{
      const r=await fetch('/api/public-stats',{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('stats');
      const data=await r.json();
      const reg=q('[data-ff-registered]',box),live=q('[data-ff-live]',box),rating=q('[data-ff-rating]',box);
      if(reg){reg.textContent=Number.isFinite(data.registered)?`${data.registered.toLocaleString()} students registered`:'Registration is open';}
      if(live){if(Number.isFinite(data.studyingNow)){live.closest('.ff-trust-chip').hidden=false;live.textContent=`${data.studyingNow} studying now`}else live.closest('.ff-trust-chip').hidden=true;}
      if(rating&&Number.isFinite(data.ratingAverage)&&data.ratingCount>0)rating.textContent=`${data.ratingAverage.toFixed(1)} / 5 · ${data.ratingCount} ratings`;
    }catch{}
  }

  async function sendRating(value,box){
    if(localStorage.getItem('finalforge_platform_rated'))return;
    const buttons=qa('.ff-rating-button',box);buttons.forEach(b=>b.disabled=true);
    try{
      const r=await fetch('/api/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:value})});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Could not save rating');
      localStorage.setItem('finalforge_platform_rated',String(value));
      const label=q('[data-ff-rating]',box);if(label&&Number.isFinite(data.ratingAverage))label.textContent=`${data.ratingAverage.toFixed(1)} / 5 · ${data.ratingCount} ratings`;
      buttons.forEach((b,i)=>{b.style.color=i<value?'#8B7CFF':''});
      window.toast?.('Thanks for rating FinalForge');
    }catch(err){buttons.forEach(b=>b.disabled=false);window.toast?.(err.message||'Could not save rating')}
  }

  function installTrust(){
    const hero=q('.hero-copy');if(!hero||q('.ff-trust-row',hero))return;
    const box=document.createElement('div');box.className='ff-trust-row';box.setAttribute('aria-label','FinalForge trust and usage');
    box.innerHTML=`
      <span class="ff-trust-chip">${svg('users','ff-icon ff-icon-sm')}<span data-ff-registered>Loading registration…</span></span>
      <span class="ff-trust-chip" hidden><i class="ff-live-dot"></i><span data-ff-live></span></span>
      <span class="ff-trust-chip">${svg('shield','ff-icon ff-icon-sm')}<span>Verified SLIIT access</span></span>
      <span class="ff-trust-chip">${svg('star','ff-icon ff-icon-sm')}<span data-ff-rating>Rate FinalForge</span></span>
      <span class="ff-rating" aria-label="Rate FinalForge from 1 to 5">
        ${[1,2,3,4,5].map(n=>`<button class="ff-rating-button" type="button" aria-label="Rate ${n} out of 5" data-rating="${n}">${svg('star','ff-icon ff-icon-sm')}</button>`).join('')}
      </span>`;
    const actions=q('.hero-actions',hero);actions?.insertAdjacentElement('afterend',box);
    qa('.ff-rating-button',box).forEach(b=>b.addEventListener('click',()=>sendRating(Number(b.dataset.rating),box)));
    const prior=Number(localStorage.getItem('finalforge_platform_rated')||0);if(prior)qa('.ff-rating-button',box).forEach((b,i)=>{b.disabled=true;b.style.color=i<prior?'#8B7CFF':''});
    loadStats(box);
  }

  function refresh(root=document){applyComponents(root);upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'));cleanFunctionalEmoji(root);installPasswordOverride();installTrust();}
  let queued=false;
  const observer=new MutationObserver(list=>{
    if(document.body.classList.contains('auth-pending')||queued||!list.some(m=>m.addedNodes.length))return;
    queued=true;requestAnimationFrame(()=>{queued=false;refresh()});
  });
  function boot(){document.documentElement.classList.add('ff-tailwind-v6');refresh();const app=q('.app');if(app&&!observer._on){observer.observe(app,{subtree:true,childList:true});observer._on=true}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('finalforge-ready',boot);
  document.addEventListener('click',e=>{if(e.target.closest('[data-go]'))requestAnimationFrame(()=>{upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'))})});
})();
