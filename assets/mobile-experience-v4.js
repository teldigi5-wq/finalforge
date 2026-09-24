/* FinalForge mobile experience v4 — app-like bottom navigation with an overflow sheet. */
(() => {
  const root = document.getElementById('mobileNav');
  const desktopNav = document.getElementById('nav');
  if (!root) return;

  const primary = [
    ['home','🏠','Home'],
    ['modules','📚','Modules'],
    ['resources','📁','Resources'],
    ['practice','🎯','Practice']
  ];
  const secondary = [
    ['schedule','🗓️','Schedule'],
    ['planner','✅','Planner'],
    ['roadmap','🧭','Roadmap']
  ];
  const overflowIds = new Set(['schedule','planner','roadmap','admin']);

  const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const navButton = ([id,icon,label], cls='') => `<button type="button" class="${cls}" data-go="${esc(id)}" aria-label="${esc(label)}"><span class="mobile-nav-icon" aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`;

  function currentSection(){ return document.querySelector('.section.active')?.id || 'home'; }
  function hasAdmin(){ return !!desktopNav?.querySelector('[data-go="admin"]'); }

  function build(){
    const extra = [...secondary];
    if(hasAdmin()) extra.push(['admin','🛡️','Admin']);
    root.innerHTML = `
      <div class="mobile-nav-scrim" id="mobileNavScrim" aria-hidden="true"></div>
      <div class="mobile-more-sheet" id="mobileMoreSheet" aria-hidden="true" role="dialog" aria-label="More navigation">
        <div class="mobile-sheet-handle" aria-hidden="true"></div>
        <div class="mobile-sheet-title">More</div>
        <div class="mobile-more-links">${extra.map(x=>navButton(x)).join('')}</div>
      </div>
      <div class="mobile-nav-bar" role="navigation" aria-label="Primary navigation">
        ${primary.map(x=>navButton(x)).join('')}
        <button type="button" id="mobileMoreBtn" class="mobile-more-btn" aria-label="More navigation" aria-expanded="false">
          <span class="mobile-nav-icon" aria-hidden="true">•••</span><span>More</span>
        </button>
      </div>`;

    root.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.go;
      closeMore();
      if(typeof window.go==='function') window.go(id);
    }));
    root.querySelector('#mobileMoreBtn')?.addEventListener('click',toggleMore);
    root.querySelector('#mobileNavScrim')?.addEventListener('click',closeMore);
    updateActive(currentSection());
  }

  function setOpen(open){
    const sheet=root.querySelector('#mobileMoreSheet');
    const scrim=root.querySelector('#mobileNavScrim');
    const btn=root.querySelector('#mobileMoreBtn');
    if(!sheet||!scrim||!btn)return;
    sheet.classList.toggle('open',open);
    scrim.classList.toggle('open',open);
    sheet.setAttribute('aria-hidden',String(!open));
    scrim.setAttribute('aria-hidden',String(!open));
    btn.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('mobile-nav-more-open',open);
  }
  function toggleMore(){setOpen(!root.querySelector('#mobileMoreSheet')?.classList.contains('open'))}
  function closeMore(){setOpen(false)}

  function updateActive(id){
    root.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
    root.querySelector('#mobileMoreBtn')?.classList.toggle('active',overflowIds.has(id));
  }

  window.toggleMobileNavMore=toggleMore;
  window.closeMobileNavMore=closeMore;

  const previousAfterNavigate=window.finalforgeAfterNavigate;
  window.finalforgeAfterNavigate=function(id){
    try{previousAfterNavigate?.(id)}catch(err){console.warn('[FinalForge mobile nav]',err)}
    updateActive(id);
    closeMore();
  };

  if(desktopNav){
    const observer=new MutationObserver(()=>{
      const shouldHaveAdmin=hasAdmin();
      const hasMobileAdmin=!!root.querySelector('[data-go="admin"]');
      if(shouldHaveAdmin!==hasMobileAdmin) build();
    });
    observer.observe(desktopNav,{childList:true});
  }

  addEventListener('resize',()=>{if(innerWidth>900)closeMore()},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMore()});

  build();
})();
