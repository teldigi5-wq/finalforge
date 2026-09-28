/* FinalForge Premium UI v1 — one-shot enhancements only; no observers or timers. */
(()=>{
  'use strict';
  if(window.FINALFORGE_PREMIUM_UI_V1)return;
  window.FINALFORGE_PREMIUM_UI_V1=Object.freeze({version:'1.0.0'});
  const $=(s,r=document)=>r.querySelector(s);

  function heroTrust(){
    const actions=$('#home .hero-actions');
    if(!actions||$('#home .ff-premium-trust'))return;
    const row=document.createElement('div');
    row.className='ff-premium-trust';
    row.setAttribute('aria-label','FinalForge workspace highlights');
    row.innerHTML='<span><i></i>Verified SLIIT workspace</span><span><i></i>Private resources</span><span><i></i>2-hour exam studio</span>';
    actions.insertAdjacentElement('afterend',row);
  }

  function markPremium(){
    document.documentElement.classList.add('ff-premium-ui-v1');
    heroTrust();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markPremium,{once:true});
  else markPremium();
  addEventListener('finalforge-ready',markPremium,{once:true});
})();
