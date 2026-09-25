/* FinalForge appearance controller — light, OLED dark and system-aware first paint. */
(() => {
  const KEY='finalforge_theme_v1';
  const root=document.documentElement;
  const meta=document.querySelector('meta[name="theme-color"]');
  const apply=theme=>{
    root.dataset.theme=theme;
    if(meta)meta.content=theme==='dark'?'#020304':'#f6f8ff';
    const button=document.getElementById('themeToggle');
    if(button){button.innerHTML=`<span aria-hidden="true">${theme==='dark'?'☀':'☾'}</span>`;button.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');button.title=theme==='dark'?'Light mode':'OLED dark mode';}
  };
  const boot=()=>{
    let theme=root.dataset.theme||'dark';apply(theme);
    document.getElementById('themeToggle')?.addEventListener('click',()=>{theme=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem(KEY,theme);apply(theme);});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
