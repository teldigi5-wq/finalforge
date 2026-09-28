/* FinalForge Theme Toggle Stability v1 — bounded theme transitions and auth-layout recovery. */
(() => {
  'use strict';

  if (window.FINALFORGE_THEME_STABILITY) return;

  const root=document.documentElement;
  let switching=false;
  let releaseTimer=0;

  function markAuthSystemStyle(){
    const link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(item=>item.href&&item.href.includes('assets/auth-system-v2.css'));
    if(link)link.dataset.finalforgeAuthV2='1';
  }

  function hideLegacyBootStatus(){
    const status=document.getElementById('authBootStatus');
    if(!status)return;
    status.hidden=true;
    status.setAttribute('aria-hidden','true');
  }

  function recoverAuthLayout(){
    const body=document.body;
    if(!body?.classList.contains('auth-pending'))return;
    if(document.querySelector('dialog[open]'))return;

    root.classList.remove('ff-scroll-locked');
    body.classList.remove('ff-scroll-locked','mobile-nav-more-open','ff-v2-palette-open');

    const sheet=document.getElementById('mobileMoreSheet');
    if(sheet&&!sheet.matches(':focus-within'))sheet.classList.remove('open');

    const palette=document.getElementById('ffV2Palette');
    if(palette&&!palette.matches(':focus-within'))palette.hidden=true;

    const card=document.querySelector('#authGate .auth-card');
    if(card){
      card.scrollLeft=0;
      card.style.removeProperty('transform');
    }
  }

  function begin(){
    if(switching)return false;
    switching=true;
    clearTimeout(releaseTimer);
    root.classList.add('ff-theme-switching');
    hideLegacyBootStatus();
    return true;
  }

  function end(){
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(()=>{
      root.classList.remove('ff-theme-switching');
      switching=false;
      recoverAuthLayout();
    },140);
  }

  function cancel(){
    clearTimeout(releaseTimer);
    root.classList.remove('ff-theme-switching');
    switching=false;
    recoverAuthLayout();
  }

  function recover(){
    markAuthSystemStyle();
    hideLegacyBootStatus();
    recoverAuthLayout();
  }

  window.FINALFORGE_THEME_STABILITY=Object.freeze({begin,end,cancel,recover});

  recover();
  addEventListener('pageshow',recover,{passive:true});
  addEventListener('focus',()=>setTimeout(recover,0),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')recover()},{passive:true});
  addEventListener('finalforge-ready',recover,{once:true});
})();
