/* FinalForge Reference UI v76 decorator — presentation only. */
(()=>{
  'use strict';
  if(window.FINALFORGE_REFERENCE_UI_V76)return;
  window.FINALFORGE_REFERENCE_UI_V76=Object.freeze({version:'76.0.0',mode:'reference-ui'});
  document.documentElement.classList.add('ff-reference-ui-v76');

  const $=(s,r=document)=>r.querySelector(s);
  const titleCase=value=>String(value||'').trim().replace(/\b\w/g,ch=>ch.toUpperCase());

  function displayName(){
    const raw=$('#accountPrimary')?.textContent?.trim()||'';
    if(!raw||/^(student|sign in|account)$/i.test(raw))return 'Student';
    const first=raw.split(/\s+/)[0];
    return titleCase(first)||'Student';
  }

  function greeting(){
    const hour=new Date().getHours();
    if(hour<12)return 'Good morning';
    if(hour<18)return 'Good afternoon';
    return 'Good evening';
  }

  function ensureHomeHeader(){
    const home=$('#home');
    const hero=$('#home .hero-v3');
    if(!home||!hero)return;
    let head=$('.ff-v76-home-head',home);
    if(!head){
      head=document.createElement('div');
      head.className='ff-v76-home-head';
      head.innerHTML='<div><h1><span data-v76-greeting></span>, <span data-v76-name></span></h1><p>Ready for your next study session?</p></div><span class="ff-v76-home-badge">● Secure cloud workspace</span>';
      home.insertBefore(head,hero);
    }
    const g=$('[data-v76-greeting]',head);if(g)g.textContent=greeting();
    const n=$('[data-v76-name]',head);if(n)n.textContent=displayName();
  }

  function ensureNavLabels(){
    const nav=$('#nav');
    if(!nav)return;
    nav.querySelectorAll('.ff-v76-nav-label').forEach(node=>node.remove());
    const groups=[
      ['modules','Study'],
      ['schedule','Plan'],
      ['roadmap','Academic'],
      ['analytics','Insights']
    ];
    for(const [target,label] of groups){
      const button=nav.querySelector(`[data-go="${target}"]`);
      if(!button)continue;
      const marker=document.createElement('span');
      marker.className='ff-v76-nav-label';
      marker.textContent=label;
      button.before(marker);
    }
  }

  function tuneAuthCopy(){
    const heading=$('#authGate .ff-auth-brandcontent h1');
    const copy=$('#authGate .ff-auth-brandcontent>p');
    if(heading&&!heading.dataset.v76Copy){
      heading.dataset.v76Copy='1';
      heading.innerHTML='Forge Your<br><span class="gradient-text">Academic Edge.</span>';
    }
    if(copy&&!copy.dataset.v76Copy){
      copy.dataset.v76Copy='1';
      copy.textContent='Everything you need for your university journey — organized, focused and built for results.';
    }
  }

  function refresh(){
    tuneAuthCopy();
    if(document.body.classList.contains('ff-authenticated')){
      ensureHomeHeader();
      ensureNavLabels();
    }
  }

  let queued=false;
  const queueRefresh=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh()});
  };

  addEventListener('finalforge-ready',queueRefresh);
  addEventListener('finalforge-after-navigate',queueRefresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRefresh()});
  document.addEventListener('DOMContentLoaded',queueRefresh,{once:true});

  const observer=new MutationObserver(queueRefresh);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-mode']});
  queueRefresh();
})();
