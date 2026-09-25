/* FinalForge Product Motion v5 — restrained interaction layer; no feature/data changes. */
(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const seen=new WeakSet(), progressSeen=new WeakSet(), numberSeen=new WeakSet();

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
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    spark:'<path d="m12 3-1.4 4.1a2 2 0 0 1-1.3 1.3L5 10l4.3 1.6a2 2 0 0 1 1.3 1.3L12 17l1.4-4.1a2 2 0 0 1 1.3-1.3L19 10l-4.3-1.6a2 2 0 0 1-1.3-1.3Z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    book:'<path d="M2 4h6a4 4 0 0 1 4 4v12a4 4 0 0 0-4-4H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a4 4 0 0 1 4-4h6Z"/>'
  };
  const svg=(name,cls='ff-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`;

  function iconNameFor(el){
    const go=el.dataset?.go;
    if(go&&ICONS[go])return go;
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

  function cleanLeadingEmoji(text){return String(text||'').replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u,'').trim()}

  function upgradeNav(root){
    if(!root)return;
    qa('button[data-go]',root).forEach(b=>{
      if(q('svg',b))return;
      const label=q('span',b)?.textContent||cleanLeadingEmoji(b.textContent);
      b.innerHTML=`${svg(iconNameFor(b))}<span>${label}</span>`;
    });
    if(innerWidth>900)ensureSlidingIndicator(root);
  }

  function ensureSlidingIndicator(nav){
    let ind=q('.ff-nav-indicator',nav);
    if(!ind){
      ind=document.createElement('i');ind.className='ff-nav-indicator';
      Object.assign(ind.style,{position:'absolute',left:'0',right:'0',height:'44px',borderRadius:'11px',background:'linear-gradient(90deg,rgba(79,124,255,.10),rgba(118,87,255,.07))',border:'1px solid rgba(111,123,255,.14)',pointerEvents:'none',transition:'transform 220ms cubic-bezier(.22,1,.36,1), height 220ms cubic-bezier(.22,1,.36,1)',zIndex:'0'});
      nav.prepend(ind);
      qa('button[data-go]',nav).forEach(b=>b.style.zIndex='1');
    }
    const active=q('button.active[data-go]',nav);
    if(active){ind.style.height=`${active.offsetHeight}px`;ind.style.transform=`translateY(${active.offsetTop}px)`}
  }

  function upgradeQuickActions(){
    qa('.quick-dock>button').forEach(b=>{
      const slot=b.firstElementChild;
      if(slot&&!q('svg',slot)){slot.className='ff-icon-wrap';slot.innerHTML=svg(iconNameFor(b));}
    });
    qa('.hero-actions .btn').forEach(b=>{
      if(q('svg',b))return;
      const text=cleanLeadingEmoji(b.textContent);b.innerHTML=`${svg(iconNameFor(b))}<span>${text}</span>`;
      b.style.display='inline-flex';b.style.alignItems='center';b.style.gap='8px';
    });
    qa('.module-icon').forEach(x=>{if(!q('svg',x))x.innerHTML=svg('book')});
  }

  function installSearchIcon(){
    qa('.ff-global-search').forEach(box=>{
      const first=box.firstChild;
      if(!q('svg',box))box.insertAdjacentHTML('afterbegin',svg('search'));
      if(first?.nodeType===3&&first.textContent.trim())first.textContent='';
    });
  }

  function revealScan(root=document){
    if(reduce)return;
    const nodes=qa('.card,.quick-dock>button,.timeline-row,.task,.section-head',root).filter(n=>!seen.has(n));
    nodes.forEach((el,i)=>{
      seen.add(el);el.classList.add('ff-enter');el.style.transitionDelay=`${Math.min(i%5,4)*55}ms`;
      entranceObserver.observe(el);
    });
  }
  const entranceObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('ff-entered');entranceObserver.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -4% 0px'});

  function animateProgress(root=document){
    if(reduce)return;
    qa('.progressbar i,.mock-progress i',root).forEach(el=>{
      if(progressSeen.has(el))return;progressSeen.add(el);
      const target=el.style.width||getComputedStyle(el).width;
      if(!target||target==='0px')return;
      el.dataset.ffTargetWidth=target;el.style.width='0%';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.width=target}));
    });
  }

  function animateStat(el){
    if(reduce||numberSeen.has(el))return;numberSeen.add(el);
    const raw=(el.textContent||'').trim(),m=raw.match(/^([\d,.]+)(%?)$/);if(!m)return;
    const target=Number(m[1].replace(/,/g,''));if(!Number.isFinite(target)||target>5000)return;
    const suffix=m[2]||'',start=performance.now(),dur=760;
    const step=now=>{const p=Math.min(1,(now-start)/dur),ease=1-Math.pow(1-p,3),v=Math.round(target*ease);el.textContent=v.toLocaleString()+suffix;if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
  }
  function animateNumbers(root=document){qa('.stat strong,#overall,#resCount,#moduleCount,#examCount',root).forEach(animateStat)}

  function installTilt(){
    if(reduce||matchMedia('(hover:none)').matches)return;
    qa('.hero-main,.practice-hero').forEach(card=>{
      if(card.dataset.ffTilt==='1')return;card.dataset.ffTilt='1';card.classList.add('ff-tilt');
      let tiltQueued=false,tiltEvent=null;
      card.addEventListener('pointermove',e=>{tiltEvent=e;if(tiltQueued)return;tiltQueued=true;requestAnimationFrame(()=>{tiltQueued=false;const r=card.getBoundingClientRect(),x=(tiltEvent.clientX-r.left)/r.width-.5,y=(tiltEvent.clientY-r.top)/r.height-.5;card.style.transform=`perspective(1100px) rotateX(${(-y*3).toFixed(2)}deg) rotateY(${(x*3).toFixed(2)}deg) translateY(-1px)`})},{passive:true});
      card.addEventListener('pointerleave',()=>card.style.transform='');
    });
  }

  function parallax(){
    if(reduce||innerWidth<901)return;
    const hero=q('.hero-main');if(!hero||hero.dataset.ffParallax==='1')return;hero.dataset.ffParallax='1';
    let parallaxQueued=false,parallaxEvent=null;
    addEventListener('pointermove',e=>{parallaxEvent=e;if(parallaxQueued)return;parallaxQueued=true;requestAnimationFrame(()=>{parallaxQueued=false;const x=(parallaxEvent.clientX/innerWidth-.5)*10,y=(parallaxEvent.clientY/innerHeight-.5)*8;hero.style.setProperty('--ff-px',`${x}px`);hero.style.setProperty('--ff-py',`${y}px`)})},{passive:true});
  }

  function installSkeletonHooks(){
    const body=q('#adminUsersBody');if(!body||body.dataset.ffSkeletonHook)return;body.dataset.ffSkeletonHook='1';
    new MutationObserver(()=>{qa('tr',body).forEach(tr=>{if((tr.textContent||'').includes('Loading'))tr.classList.add('ff-skeleton')})}).observe(body,{childList:true,subtree:true});
  }

  function refresh(){
    upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'));upgradeQuickActions();installSearchIcon();revealScan();animateProgress();animateNumbers();installTilt();parallax();installSkeletonHooks();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-go]');if(b)requestAnimationFrame(()=>{ensureSlidingIndicator(q('#nav'));refresh()});
  });

  let queued=false;
  const mo=new MutationObserver(muts=>{
    if(document.body.classList.contains('auth-pending')||queued||!muts.some(m=>m.addedNodes.length))return;
    queued=true;requestAnimationFrame(()=>{queued=false;refresh()});
  });
  addEventListener('finalforge-ready',()=>{if(!document.body.classList.contains('auth-pending'))refresh();mo.observe(q('.app'),{childList:true,subtree:true});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(!document.body.classList.contains('auth-pending'))refresh()},{once:true});
  else if(!document.body.classList.contains('auth-pending'))refresh();
  let resizeQueued=false;
  addEventListener('resize',()=>{if(resizeQueued)return;resizeQueued=true;requestAnimationFrame(()=>{resizeQueued=false;upgradeNav(q('#nav'));upgradeNav(q('#mobileNav'));ensureSlidingIndicator(q('#nav'))})},{passive:true});
})();
