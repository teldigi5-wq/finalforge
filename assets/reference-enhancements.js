/* FinalForge reference experience enhancements.
   Visual motion only: existing navigation, authentication and study logic stay authoritative. */
(()=>{
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const precise=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const wired=new WeakSet();

  function addAtmosphere(){
    const hero=q('.hero-main');
    if(hero&&!q('.ff-hero-atmosphere',hero)){
      const layer=document.createElement('div');
      layer.className='ff-hero-atmosphere';
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML='<i></i><i></i><i></i>';
      hero.prepend(layer);
    }
    const brand=q('.auth-brand-panel');
    if(brand&&!q('.ff-auth-depth',brand)){
      const layer=document.createElement('div');
      layer.className='ff-auth-depth';
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML='<i></i><i></i>';
      brand.prepend(layer);
    }
  }

  function wireDepthCard(card,index){
    if(!precise||reduce||wired.has(card))return;
    wired.add(card);
    card.classList.add('ff-depth-card');
    card.style.setProperty('--ff-depth-delay',`${Math.min(index,8)*35}ms`);
    card.addEventListener('pointermove',event=>{
      const rect=card.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width;
      const y=(event.clientY-rect.top)/rect.height;
      card.style.setProperty('--ff-rx',`${((.5-y)*4).toFixed(2)}deg`);
      card.style.setProperty('--ff-ry',`${((x-.5)*5).toFixed(2)}deg`);
      card.style.setProperty('--ff-glow-x',`${(x*100).toFixed(1)}%`);
      card.style.setProperty('--ff-glow-y',`${(y*100).toFixed(1)}%`);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('--ff-rx');
      card.style.removeProperty('--ff-ry');
      card.style.removeProperty('--ff-glow-x');
      card.style.removeProperty('--ff-glow-y');
    },{passive:true});
  }

  function enhanceCards(){
    qa('.quick-dock>button,.module-card,.resource,.stat,.planner-card,.exam-card,.paper-card')
      .slice(0,32)
      .forEach(wireDepthCard);
  }

  function markLoaded(){
    document.documentElement.classList.add('ff-reference-ready');
  }

  function refresh(){
    addAtmosphere();
    enhanceCards();
    markLoaded();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
  addEventListener('finalforge-ready',refresh,{once:true});
  new MutationObserver(mutations=>{
    if(mutations.some(item=>item.addedNodes.length))requestAnimationFrame(enhanceCards);
  }).observe(document.body,{childList:true,subtree:true});
})();
