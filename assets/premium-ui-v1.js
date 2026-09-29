/* FinalForge Premium UI v2.3.1 — role-aware, event-driven, stability-first premium study surface. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PREMIUM_UI_V231)return;
  window.FINALFORGE_PREMIUM_UI_V231=Object.freeze({version:'2.3.1',mode:'role-aware-premium'});
  window.FINALFORGE_PREMIUM_UI_V23=window.FINALFORGE_PREMIUM_UI_V231;
  window.FINALFORGE_PREMIUM_UI_V2=window.FINALFORGE_PREMIUM_UI_V231;
  window.FINALFORGE_PREMIUM_UI_V1=window.FINALFORGE_PREMIUM_UI_V231;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const icons={
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9A1.5 1.5 0 0 1 19 21h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
    modules:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/></svg>',
    resources:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v10A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M3.5 10h17"/></svg>',
    practice:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3V1.5M21 12h1.5M12 21v1.5M3 12H1.5"/></svg>',
    schedule:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
    planner:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m8 9 1.5 1.5L12 8M14 10h3M8 15l1.5 1.5L12 14M14 16h3"/></svg>',
    roadmap:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M7.5 16.5 11 13a3 3 0 0 0 0-4.2L9.5 7.3M14.5 7.5 13 9a3 3 0 0 0 0 4.2l1.5 1.5"/></svg>',
    analytics:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    admin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };
  const labels={home:'Home',modules:'Modules',resources:'Resources',practice:'Practice',schedule:'Schedule',planner:'Planner',roadmap:'Roadmap',analytics:'Analytics',admin:'Admin'};
  const originalGo=typeof window.go==='function'?window.go.bind(window):null;
  let accessScheduled=false;

  function ensurePremiumSurface(){
    let link=document.querySelector('link[data-ff-premium-studyhub]');
    if(link&&link.href.includes('premium-studyhub-v2.css'))return;
    if(link)link.remove();
    link=document.createElement('link');
    link.rel='stylesheet';
    link.href='assets/premium-studyhub-v2.css?v=role-premium-231';
    link.dataset.ffPremiumStudyhub='2';
    document.head.appendChild(link);
  }

  function ensureStateStyles(){
    if($('#ff-ui-state-normalizer'))return;
    const style=document.createElement('style');
    style.id='ff-ui-state-normalizer';
    style.textContent=`
      body.ff-authenticated .nav button{position:relative!important;overflow:hidden!important}
      body.ff-authenticated .nav button::before,body.ff-authenticated .nav button::after{content:none!important;display:none!important}
      body.ff-authenticated .nav button.active{border-color:rgba(94,143,218,.24)!important}
      body.ff-authenticated .nav button.active .ff-nav-icon{color:#7fb1f6!important}
      body.ff-authenticated .nav button:focus-visible{outline:2px solid rgba(91,140,255,.46)!important;outline-offset:2px!important}
      body.ff-authenticated .ff-resource-row:focus-within{border-color:rgba(91,140,255,.28)!important}
      body.ff-authenticated .ff-resource-actions .btn[aria-busy='true']{cursor:progress!important;opacity:.82!important}
      body.ff-authenticated .ff-btn-spinner{animation:ffButtonSpin .75s linear infinite!important}
      body.ff-role-student #home .quick-dock{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      @keyframes ffButtonSpin{to{transform:rotate(360deg)}}
      @media(max-width:900px){body.ff-role-student #home .quick-dock{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:620px){body.ff-role-student #home .quick-dock{grid-template-columns:1fr!important}}
      @media(prefers-reduced-motion:reduce){body.ff-authenticated .ff-btn-spinner{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function daypart(){
    const hour=new Date().getHours();
    if(hour<12)return'Good morning';
    if(hour<18)return'Good afternoon';
    return'Good evening';
  }

  function isAuthenticated(){return document.body?.classList.contains('ff-authenticated')&&!document.body?.classList.contains('auth-pending')}
  function isAdmin(){
    if(!isAuthenticated())return false;
    const primary=String($('#accountPrimary')?.textContent||'').trim().toLowerCase();
    return primary==='administrator'&&Boolean(document.querySelector('[data-go="admin"]'));
  }

  function roadmapControls(){
    const direct=$$('[data-go="roadmap"]');
    const inline=$$('[onclick]').filter(node=>String(node.getAttribute('onclick')||'').includes("go('roadmap')")||String(node.getAttribute('onclick')||'').includes('go("roadmap")'));
    return [...new Set([...direct,...inline])];
  }

  function applyRoleAccess(){
    accessScheduled=false;
    const body=document.body;
    if(!body)return;

    if(!isAuthenticated()){
      body.classList.remove('ff-role-admin','ff-role-student');
      roadmapControls().forEach(node=>{node.dataset.ffRoadmapControl='1';node.hidden=true;node.setAttribute('aria-hidden','true');node.tabIndex=-1});
      return;
    }

    const admin=isAdmin();
    body.classList.toggle('ff-role-admin',admin);
    body.classList.toggle('ff-role-student',!admin);

    if(!admin)$$('[data-go="admin"]').forEach(node=>node.remove());

    roadmapControls().forEach(node=>{
      node.dataset.ffRoadmapControl='1';
      node.hidden=!admin;
      node.setAttribute('aria-hidden',String(!admin));
      if(admin)node.removeAttribute('tabindex');else node.tabIndex=-1;
    });

    const section=$('#roadmap');
    if(section){
      section.hidden=!admin;
      section.setAttribute('aria-hidden',String(!admin||!section.classList.contains('active')));
      if(!admin)section.setAttribute('inert','');
      else if(section.classList.contains('active'))section.removeAttribute('inert');
    }

    if(!admin&&section?.classList.contains('active'))originalGo?.('home');
  }

  function scheduleRoleAccess(){
    if(accessScheduled)return;
    accessScheduled=true;
    requestAnimationFrame(applyRoleAccess);
  }

  function roleRefreshBurst(){
    [0,220,650,1300,2600].forEach(delay=>setTimeout(scheduleRoleAccess,delay));
  }

  function installRouteGuard(){
    if(window.FINALFORGE_ADMIN_ROUTE_GUARD||!originalGo)return;
    window.FINALFORGE_ADMIN_ROUTE_GUARD=true;
    window.go=(id,...args)=>{
      if(String(id||'')==='roadmap'&&!isAdmin()){
        try{window.toast?.('Roadmap is available to administrators only.')}catch{}
        scheduleRoleAccess();
        return false;
      }
      return originalGo(id,...args);
    };
  }

  function bindRoleEvents(){
    if(window.FINALFORGE_ROLE_EVENTS_BOUND)return;
    window.FINALFORGE_ROLE_EVENTS_BOUND=true;
    document.addEventListener('submit',roleRefreshBurst,true);
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#authGate,#accountChip,[data-go],.account-menu'))roleRefreshBurst();
    },true);
    addEventListener('focus',scheduleRoleAccess,{passive:true});
    addEventListener('pageshow',roleRefreshBurst,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)roleRefreshBurst()});
  }

  function refineNavigation(){
    $$('button[data-go]').forEach(button=>{
      const key=button.dataset.go;
      if(!icons[key]||!labels[key])return;
      button.innerHTML=`<span class="ff-nav-icon">${icons[key]}</span><span>${labels[key]}</span>`;
    });
    scheduleRoleAccess();
  }

  function refineTopbar(){
    const top=$('.topbar');
    const copy=top?.firstElementChild;
    if(!copy)return;
    const kicker=$('.kicker',copy),sub=$('.muted',copy);
    if(kicker)kicker.textContent=daypart();
    if(sub)sub.textContent='Your focused study workspace is ready.';
  }

  function refineHome(){
    const home=$('#home');
    if(!home)return;
    home.classList.add('ff-focused-home');
    $('.ff-premium-trust',home)?.remove();
    const hero=$('.hero-copy',home);
    if(hero){
      const kicker=$('.kicker',hero),title=$('h1',hero),description=$('p.muted',hero);
      if(kicker)kicker.textContent='FinalForge student workspace';
      if(title)title.innerHTML=`${daypart()}.<br><span class="gradient-text">Own the next study session.</span>`;
      if(description)description.textContent='Move from lecture resources to focused practice, mock exams and progress tracking without losing your place.';
      const buttons=$$('.hero-actions .btn',hero);
      const copy=['Start practice','Study next','Admin roadmap'];
      buttons.forEach((button,index)=>{if(copy[index])button.textContent=copy[index]});
    }
    const notice=$('.notice',home);const strong=notice?.querySelector('strong');if(strong)strong.textContent='Next exam';
    scheduleRoleAccess();
  }

  function refineQuickDock(){
    const buttons=$$('#home .quick-dock>button');
    const glyphs=[icons.practice,icons.resources,icons.planner,icons.roadmap];
    buttons.forEach((button,index)=>{
      const slot=button.querySelector(':scope>span');
      if(slot&&glyphs[index]){slot.classList.add('ff-quick-icon');slot.innerHTML=glyphs[index]}
    });
    scheduleRoleAccess();
  }

  function refine(){
    document.documentElement.classList.add('ff-premium-ui-v2');
    ensurePremiumSurface();
    ensureStateStyles();
    installRouteGuard();
    bindRoleEvents();
    refineTopbar();
    refineNavigation();
    refineHome();
    refineQuickDock();
    roleRefreshBurst();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refine,{once:true});else refine();
  addEventListener('finalforge-ready',()=>requestAnimationFrame(refine),{once:true});
  addEventListener('finalforge-after-navigate',event=>{
    if(['home','analytics','roadmap'].includes(event?.detail?.id))requestAnimationFrame(refineNavigation);
    if(event?.detail?.id==='home')requestAnimationFrame(()=>{refineHome();refineQuickDock()});
    roleRefreshBurst();
  });
})();
