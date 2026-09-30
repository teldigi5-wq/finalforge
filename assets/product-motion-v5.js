/* FinalForge Product Motion v6 — event-driven polish with no app-wide mutation observer. */
(()=>{
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const seen=new WeakSet(), progressSeen=new WeakSet();

  const ICONS={
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    modules:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    resources:'<path d="M3 6h6l2 2h10v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 6V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/>',
    practice:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m16 8 5-5"/><path d="M16 3h5v5"/>',
    schedule:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    planner:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 11 2 2 4-4M8 7h8M8 17h8"/>',
    roadmap:'<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17c0-5 12-5 12-10"/><path d="m13 7 3-2-3-2"/>',
    admin:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    spark:'<path d="m12 3-1.4 4.1a2 2 0 0 1-1.3 1.3L5 10l4.3 1.6a2 2 0 0 1 1.3 1.3L12 17l1.4-4.1a2 2 0 0 1 1.3-1.3L19 10l-4.3-1.6a2 2 0 0 1-1.3-1.3Z"/>',
    book:'<path d="M2 4h6a4 4 0 0 1 4 4v12a4 4 0 0 0-4-4H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a4 4 0 0 1 4-4h6Z"/>'
  };
  const svg=(name,cls='ff-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`;
  function iconNameFor(el){
    const go=el.dataset?.go;if(go&&ICONS[go])return go;
    const t=(el.textContent||'').toLowerCase();
    if(t.includes('home')||t.includes('dashboard'))return 'home';
    if(t.includes('module'))return 'modules';
    if(t.includes('resource')||t.includes('download'))return 'resources';
    if(t.includes('practice')||t.includes('quiz')||t.includes('mock'))return 'practice';
    if(t.includes('schedule')||t.includes('timetable'))return 'schedule';
    if(t.includes('planner')||t.includes('study next'))return 'planner';
    if(t.includes('roadmap'))return 'roadmap';
    if(t.includes('admin')||t.includes('security'))return 'admin';
    if(t.includes('print')||t.includes('paper')||t.includes('sheet')||t.includes('file'))return 'file';
    if(t.includes('resume')||t.includes('time'))return 'clock';
    return 'spark';
  }
  const cleanLeadingEmoji=text=>String(text||'').replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u,'').trim();

  function ensureSlidingIndicator(nav){
    if(!nav||innerWidth<=900)return;
    let ind=q('.ff-nav-indicator',nav);
    if(!ind){
      ind=document.createElement('i');ind.className='ff-nav-indicator';
      Object.assign(ind.style,{position:'absolute',left:'0',right:'0',height:'44px',borderRadius:'11px',background:'linear-gradient(90deg,rgba(79,124,255,.10),rgba(118,87,255,.07))',border:'1px solid rgba(111,123,255,.14)',pointerEvents:'none',transition:reduce?'none':'transform 180ms ease, height 180ms ease',zIndex:'0'});
      nav.prepend(ind);qa('button[data-go]',nav).forEach(b=>b.style.zIndex='1');
    }
    const active=q('button.active[data-go]',nav);if(active){ind.style.height=`${active.offsetHeight}px`;ind.style.transform=`translateY(${active.offsetTop}px)`}
  }

  function upgradeNav(root){
    if(!root)return;
    qa('button[data-go]',root).forEach(b=>{
      if(q('svg',b))return;
      const label=q('span',b)?.textContent||cleanLeadingEmoji(b.textContent);
      b.innerHTML=`${svg(iconNameFor(b))}<span>${label}</span>`;
    });
    ensureSlidingIndicator(root);
  }

  function upgradeQuickActions(){
    qa('.quick-dock>button').forEach(b=>{const slot=b.firstElementChild;if(slot&&!q('svg',slot)){slot.className='ff-icon-wrap';slot.innerHTML=svg(iconNameFor(b))}});
    qa('.hero-actions .btn').forEach(b=>{if(q('svg',b))return;const text=cleanLeadingEmoji(b.textContent);b.innerHTML=`${svg(iconNameFor(b))}<span>${text}</span>`;b.style.display='inline-flex';b.style.alignItems='center';b.style.gap='8px'});
    qa('.module-icon').forEach(x=>{if(!q('svg',x))x.innerHTML=svg('book')});
  }

  function installSearchIcon(){qa('.ff-global-search').forEach(box=>{const first=box.firstChild;if(!q('svg',box))box.insertAdjacentHTML('afterbegin',svg('search'));if(first?.nodeType===3&&first.textContent.trim())first.textContent=''})}

  const entranceObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('ff-entered');entranceObserver.unobserve(e.target)}}),{threshold:.06,rootMargin:'0px 0px -2% 0px'}):null;
  function revealScan(root=document){
    if(reduce||!entranceObserver)return;
    qa('.card,.quick-dock>button,.timeline-row,.task,.section-head',root).filter(n=>!seen.has(n)).forEach((el,i)=>{seen.add(el);el.classList.add('ff-enter');el.style.transitionDelay=`${Math.min(i%5,4)*30}ms`;entranceObserver.observe(el)});
  }
  function animateProgress(root=document){
    if(reduce)return;
    qa('.progressbar i,.mock-progress i',root).forEach(el=>{if(progressSeen.has(el))return;progressSeen.add(el);const target=el.style.width||'';if(!target)return;el.style.width='0%';requestAnimationFrame(()=>{el.style.width=target})});
  }

  function refresh(root=document){upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'));upgradeQuickActions();installSearchIcon();revealScan(root);animateProgress(root)}

  let queued=false;
  function scheduleRefresh(root=document){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;if(!document.body.classList.contains('auth-pending'))refresh(root)});
  }
  window.finalforgeRefreshEffects=scheduleRefresh;

  document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)requestAnimationFrame(()=>{ensureSlidingIndicator(q('#nav'));scheduleRefresh(document.getElementById(b.dataset.go)||document)})});
  addEventListener('finalforge-ready',()=>{if(!document.body.classList.contains('auth-pending'))scheduleRefresh()});
  addEventListener('finalforge-cloud-render-complete',()=>scheduleRefresh());
  if(document.readyState!=='loading'&&!document.body.classList.contains('auth-pending'))scheduleRefresh();

  let resizeQueued=false;
  addEventListener('resize',()=>{if(resizeQueued)return;resizeQueued=true;requestAnimationFrame(()=>{resizeQueued=false;upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'));ensureSlidingIndicator(q('#nav'))})},{passive:true});
})();
