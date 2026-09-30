/* FinalForge appearance controller — stable dark/light themes across app and auth. */
(() => {
  'use strict';

  if (window.FINALFORGE_APPEARANCE_V2) return;
  window.FINALFORGE_APPEARANCE_V2 = true;

  const KEY='finalforge_theme_v1';
  const ASSET_VERSION='auth-responsive-v1';
  const root=document.documentElement;
  const meta=document.querySelector('meta[name="theme-color"]');

  const icons={
    light:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>',
    dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.2 8.2 0 0 1 8.6 4 8.4 8.4 0 1 0 20 15.4Z"/></svg>'
  };

  function ensureHotfixStyle(){
    const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href&&link.href.includes('assets/auth-responsive-hotfix-v1.css'));
    if(existing)return existing;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`assets/auth-responsive-hotfix-v1.css?v=${ASSET_VERSION}`;
    link.dataset.finalforgeAuthResponsive='1';
    document.head.appendChild(link);
    return link;
  }

  function ensureStabilityRuntime(){
    if(window.FINALFORGE_THEME_STABILITY)return Promise.resolve();
    return new Promise(resolve=>{
      const existing=[...document.scripts].find(script=>script.src&&script.src.includes('assets/theme-toggle-stability-v1.js'));
      if(existing){
        if(existing.dataset.ffLoaded==='1'||existing.readyState==='complete')return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',resolve,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=`assets/theme-toggle-stability-v1.js?v=${ASSET_VERSION}`;
      script.async=true;
      script.onload=()=>{script.dataset.ffLoaded='1';resolve()};
      script.onerror=resolve;
      document.body.appendChild(script);
    });
  }

  function syncButton(button,theme,isAuth=false){
    if(!button)return;
    const next=theme==='dark'?'light':'dark';
    button.innerHTML=icons[next];
    button.setAttribute('aria-label',`Switch to ${next} mode`);
    button.setAttribute('aria-pressed',String(theme==='light'));
    button.title=`Switch to ${next} mode`;
    if(isAuth)button.dataset.theme=theme;
  }

  function bindToggle(button){
    if(!button||button.dataset.ffThemeBound==='1')return;
    button.dataset.ffThemeBound='1';
    button.addEventListener('click',toggle,{passive:false});
  }

  function ensureAuthToggle(){
    const gate=document.getElementById('authGate');
    if(!gate)return null;
    let button=gate.querySelector('.ff-auth-theme-toggle');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='ff-auth-theme-toggle';
      gate.appendChild(button);
    }
    bindToggle(button);
    return button;
  }

  function apply(theme,persist=false){
    theme=theme==='light'?'light':'dark';
    root.dataset.theme=theme;
    root.style.colorScheme=theme;
    if(meta)meta.content=theme==='dark'?'#07111f':'#f4f7fb';
    if(persist)try{localStorage.setItem(KEY,theme)}catch{}
    syncButton(document.getElementById('themeToggle'),theme);
    syncButton(ensureAuthToggle(),theme,true);
    window.dispatchEvent(new CustomEvent('finalforge-theme-change',{detail:{theme}}));
  }

  function toggle(event){
    event?.preventDefault?.();
    const guard=window.FINALFORGE_THEME_STABILITY;
    if(guard?.begin&&!guard.begin())return;
    const next=root.dataset.theme==='dark'?'light':'dark';
    requestAnimationFrame(()=>{
      try{apply(next,true)}
      finally{guard?.end?.()}
    });
  }

  async function boot(){
    ensureHotfixStyle();
    await ensureStabilityRuntime();
    let saved='';
    try{saved=localStorage.getItem(KEY)||''}catch{}
    const initial=saved==='light'||saved==='dark'?saved:(root.dataset.theme||'dark');
    apply(initial,false);
    bindToggle(document.getElementById('themeToggle'));
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{void boot()},{once:true}):void boot();
  addEventListener('finalforge-ready',()=>apply(root.dataset.theme||'dark',false),{once:true});
})();
