/* FinalForge Premium UI v2.1 — calm, task-led, one-shot product refinement. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PREMIUM_UI_V2)return;
  window.FINALFORGE_PREMIUM_UI_V2=Object.freeze({version:'2.1.0',mode:'task-led'});
  window.FINALFORGE_PREMIUM_UI_V1=window.FINALFORGE_PREMIUM_UI_V2;
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

  function ensureStateStyles(){
    if($('#ff-ui-state-normalizer'))return;
    const style=document.createElement('style');
    style.id='ff-ui-state-normalizer';
    style.textContent=`
      body.ff-authenticated .nav button{position:relative!important;overflow:hidden!important}
      body.ff-authenticated .nav button::before,body.ff-authenticated .nav button::after{content:none!important;display:none!important}
      body.ff-authenticated .nav button.active{box-shadow:none!important;border-color:rgba(94,143,218,.24)!important;background:linear-gradient(90deg,rgba(75,125,202,.12),rgba(75,125,202,.055))!important}
      body.ff-authenticated .nav button.active .ff-nav-icon{color:#7fb1f6!important}
      body.ff-authenticated .nav button.active .ff-nav-icon::before,body.ff-authenticated .nav button.active .ff-nav-icon::after{content:none!important;display:none!important}
      body.ff-authenticated .nav button:focus-visible{outline:2px solid rgba(91,140,255,.46)!important;outline-offset:2px!important}
      body.ff-authenticated .ff-resource-row:focus-within{border-color:rgba(91,140,255,.28)!important}
      body.ff-authenticated .ff-resource-actions .btn[aria-busy='true']{cursor:progress!important;opacity:.82!important}
      body.ff-authenticated .ff-btn-spinner{animation:ffButtonSpin .75s linear infinite!important}
      @keyframes ffButtonSpin{to{transform:rotate(360deg)}}
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

  function refineNavigation(){
    $$('button[data-go]').forEach(button=>{
      const key=button.dataset.go;
      if(!icons[key]||!labels[key])return;
      button.innerHTML=`<span class="ff-nav-icon">${icons[key]}</span><span>${labels[key]}</span>`;
    });
  }

  function refineTopbar(){
    const top=$('.topbar');
    const copy=top?.firstElementChild;
    if(!copy)return;
    const kicker=$('.kicker',copy),sub=$('.muted',copy);
    if(kicker)kicker.textContent=daypart();
    if(sub)sub.textContent='Ready for your next focused study session?';
  }

  function refineHome(){
    const home=$('#home');
    if(!home)return;
    home.classList.add('ff-focused-home');
    $('.ff-premium-trust',home)?.remove();
    const hero=$('.hero-copy',home);
    if(hero){
      const kicker=$('.kicker',hero),title=$('h1',hero),description=$('p.muted',hero);
      if(kicker)kicker.textContent='Your academic command center';
      if(title)title.innerHTML=`${daypart()}.<br><span class="gradient-text">Focus on what matters next.</span>`;
      if(description)description.textContent='Your next exam, unfinished lessons and practice plan are organized here so you can start without deciding what to do first.';
      const buttons=$$('.hero-actions .btn',hero);
      const copy=['Start practice','Study next','Build roadmap'];
      buttons.forEach((button,index)=>{if(copy[index])button.textContent=copy[index]});
    }
    const notice=$('.notice',home);
    const strong=notice?.querySelector('strong');
    if(strong)strong.textContent='Next exam';
  }

  function refineQuickDock(){
    const buttons=$$('#home .quick-dock>button');
    const glyphs=[icons.practice,icons.resources,icons.planner,icons.roadmap];
    buttons.forEach((button,index)=>{
      const slot=button.querySelector(':scope>span');
      if(slot&&glyphs[index]){slot.classList.add('ff-quick-icon');slot.innerHTML=glyphs[index]}
    });
  }

  function refine(){
    document.documentElement.classList.add('ff-premium-ui-v2');
    ensureStateStyles();
    refineTopbar();
    refineNavigation();
    refineHome();
    refineQuickDock();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refine,{once:true});
  else refine();
  addEventListener('finalforge-ready',()=>requestAnimationFrame(refine),{once:true});
  addEventListener('finalforge-after-navigate',event=>{if(['home','analytics'].includes(event?.detail?.id))requestAnimationFrame(refineNavigation);if(event?.detail?.id==='home')requestAnimationFrame(refineHome)});
})();
