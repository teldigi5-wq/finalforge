/* FinalForge appearance controller — first-class dark/light themes across app and auth. */
(() => {
  const KEY='finalforge_theme_v1';
  const root=document.documentElement;
  const meta=document.querySelector('meta[name="theme-color"]');

  const icons={
    light:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>',
    dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.2 8.2 0 0 1 8.6 4 8.4 8.4 0 1 0 20 15.4Z"/></svg>'
  };

  function syncButton(button,theme,isAuth=false){
    if(!button)return;
    const next=theme==='dark'?'light':'dark';
    button.innerHTML=icons[next];
    button.setAttribute('aria-label',`Switch to ${next} mode`);
    button.setAttribute('aria-pressed',String(theme==='light'));
    button.title=`Switch to ${next} mode`;
    if(isAuth)button.dataset.theme=theme;
  }

  function ensureAuthToggle(){
    const gate=document.getElementById('authGate');
    if(!gate||gate.querySelector('.ff-auth-theme-toggle'))return gate?.querySelector('.ff-auth-theme-toggle');
    const button=document.createElement('button');
    button.type='button';
    button.className='ff-auth-theme-toggle';
    button.addEventListener('click',toggle);
    gate.appendChild(button);
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

  function toggle(){apply(root.dataset.theme==='dark'?'light':'dark',true)}

  function boot(){
    let saved='';
    try{saved=localStorage.getItem(KEY)||''}catch{}
    const initial=saved==='light'||saved==='dark'?saved:(root.dataset.theme||'dark');
    apply(initial,false);
    const appButton=document.getElementById('themeToggle');
    if(appButton&&!appButton.dataset.ffThemeBound){appButton.dataset.ffThemeBound='1';appButton.addEventListener('click',toggle)}
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
  addEventListener('finalforge-ready',()=>apply(root.dataset.theme||'dark',false),{once:true});
})();
