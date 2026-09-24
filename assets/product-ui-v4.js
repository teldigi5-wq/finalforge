/* FinalForge Product UI v4 — lightweight shell enhancements. */
(() => {
  const q = (s, r=document) => r.querySelector(s);

  function installSearch(){
    const topbar=q('.topbar');
    if(!topbar || q('.ff-global-search',topbar)) return;
    const first=topbar.firstElementChild;
    if(first) first.classList.add('topbar-copy');
    const wrap=document.createElement('label');
    wrap.className='ff-global-search';
    wrap.innerHTML='<span aria-hidden="true">⌕</span><input id="ffGlobalSearch" type="search" autocomplete="off" placeholder="Search modules, resources, topics…"><kbd>Ctrl K</kbd>';
    topbar.insertBefore(wrap, q('.top-account-wrap',topbar) || null);
    const input=q('input',wrap);
    input.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      const term=input.value.trim();
      if(!term) return;
      if(typeof window.go==='function') window.go('resources');
      requestAnimationFrame(()=>{
        const target=q('#resourceSearch');
        if(target){ target.value=term; target.dispatchEvent(new Event('input',{bubbles:true})); target.focus(); }
      });
    });
  }

  function installKeyboard(){
    addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey) && String(e.key).toLowerCase()==='k'){
        const input=q('#ffGlobalSearch');
        if(input){e.preventDefault();input.focus();input.select();}
      }
    });
  }

  function refineSidebar(){
    const nav=q('#nav');
    if(!nav || nav.dataset.productV4==='1') return;
    nav.dataset.productV4='1';
    const btns=[...nav.querySelectorAll('button')];
    const target=btns.find(b=>b.dataset.go==='schedule');
    if(target){
      const divider=document.createElement('div');
      divider.className='ff-nav-divider';
      divider.setAttribute('aria-hidden','true');
      target.before(divider);
    }
  }

  function boot(){
    document.documentElement.classList.add('ff-product-ui-v4');
    installSearch();
    installKeyboard();
    refineSidebar();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  addEventListener('finalforge-ready',boot);
})();
