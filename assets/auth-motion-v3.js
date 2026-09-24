/* FinalForge Auth Motion v3 — subtle pointer depth and interaction polish */
(()=>{
  const gate=document.getElementById('authGate');
  const shell=gate?.querySelector('.auth-shell');
  const brand=gate?.querySelector('.auth-brand-panel');
  const card=gate?.querySelector('.auth-card');
  if(!gate||!shell||!brand||!card)return;

  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=matchMedia('(pointer:fine)').matches;
  let raf=0,tx=0,ty=0,cx=0,cy=0;

  function render(){
    cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;
    shell.style.transform=`rotateX(${(-cy*2.2).toFixed(2)}deg) rotateY(${(cx*2.8).toFixed(2)}deg)`;
    brand.style.setProperty('--ff-parallax-x',`${(-cx*8).toFixed(2)}px`);
    brand.style.setProperty('--ff-parallax-y',`${(-cy*7).toFixed(2)}px`);
    card.style.setProperty('--ff-parallax-x',`${(cx*5).toFixed(2)}px`);
    card.style.setProperty('--ff-parallax-y',`${(cy*4).toFixed(2)}px`);
    if(Math.abs(tx-cx)>.002||Math.abs(ty-cy)>.002)raf=requestAnimationFrame(render);else raf=0;
  }
  function kick(){if(!raf)raf=requestAnimationFrame(render)}

  if(!reduce&&fine){
    gate.addEventListener('pointermove',e=>{
      const r=shell.getBoundingClientRect();
      tx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));
      ty=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
      kick();
    },{passive:true});
    gate.addEventListener('pointerleave',()=>{tx=0;ty=0;kick()},{passive:true});
  }

  const forms=[...gate.querySelectorAll('.auth-view')];
  const observer=new MutationObserver(records=>{
    for(const rec of records){
      if(rec.type!=='attributes'||rec.attributeName!=='class')continue;
      const el=rec.target;
      if(el.classList.contains('active')){
        el.animate([
          {opacity:0,transform:'translateY(10px) scale(.992)',filter:'blur(3px)'},
          {opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}
        ],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
      }
    }
  });
  forms.forEach(f=>observer.observe(f,{attributes:true,attributeFilter:['class']}));

  gate.querySelectorAll('input').forEach(input=>{
    input.addEventListener('focus',()=>input.closest('label')?.classList.add('ff-field-focus'));
    input.addEventListener('blur',()=>input.closest('label')?.classList.remove('ff-field-focus'));
  });
})();
