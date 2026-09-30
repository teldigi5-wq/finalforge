/* FinalForge Question Bank v11 — authenticated published-question delivery for v75. */
(()=>{
  'use strict';
  if(window.FINALFORGE_QUESTION_BANK_V11)return;
  window.FINALFORGE_QUESTION_BANK_V11=Object.freeze({version:'11.0.0',mode:'published-question-bank'});

  const SOURCE='admin-v75';
  const BANK=window.EXAMHUB_PRACTICE||{};
  let syncPromise=null;
  let lastUser='';

  function cleanQuestion(question){
    if(!question||typeof question!=='object')return null;
    const id=String(question.id||'').trim();
    const module=String(question.module||'').trim().toLowerCase();
    const kind=String(question.kind||'').trim().toLowerCase();
    const q=String(question.q||'').trim();
    const topic=String(question.topic||'').trim();
    const coverage=Number(question.coverage);
    if(!id||!BANK[module]||!['mcq','code'].includes(kind)||!q||!topic||!Number.isInteger(coverage))return null;
    if(kind==='mcq'){
      const options=Array.isArray(question.o)?question.o.map(value=>String(value||'').trim()).filter(Boolean):[];
      const answer=Number(question.a);
      if(options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)return null;
      return {id:`admin-${id}`,coverage,topic,q,o:options,a:answer,e:String(question.e||''),snippet:String(question.snippet||''),_finalforgeSource:SOURCE,_finalforgeQuestionId:id};
    }
    const rubric=Array.isArray(question.p)?question.p.map(value=>String(value||'').trim()).filter(Boolean):[];
    if(!rubric.length)return null;
    return {id:`admin-${id}`,coverage,topic,q,p:rubric,starter:String(question.starter||''),pattern:String(question.pattern||''),e:String(question.e||''),snippet:String(question.snippet||''),_finalforgeSource:SOURCE,_finalforgeQuestionId:id};
  }

  function clearPublished(){
    Object.values(BANK).forEach(module=>{
      if(!module||typeof module!=='object')return;
      for(const kind of ['mcq','code']){
        if(Array.isArray(module[kind]))module[kind]=module[kind].filter(question=>question?._finalforgeSource!==SOURCE);
      }
    });
  }

  function applyPublished(questions){
    clearPublished();
    let added=0;
    for(const raw of Array.isArray(questions)?questions:[]){
      const question=cleanQuestion(raw);if(!question)continue;
      const module=String(raw.module||'').trim().toLowerCase();
      const kind=String(raw.kind||'').trim().toLowerCase();
      const target=BANK[module]?.[kind];if(!Array.isArray(target))continue;
      const duplicate=target.some(item=>String(item?.q||'').trim().toLowerCase()===question.q.toLowerCase());
      if(duplicate)continue;
      target.push(question);added++;
    }
    window.dispatchEvent(new CustomEvent('finalforge-question-bank-updated',{detail:{count:added,source:SOURCE}}));
    return added;
  }

  async function requestPublished(user){
    const token=await user.getIdToken(false);
    const response=await fetch('/api/question-bank',{
      method:'GET',
      headers:{Accept:'application/json','X-FinalForge-Token':token},
      credentials:'same-origin',
      cache:'no-store'
    });
    const text=await response.text();
    let result={};
    try{result=text?JSON.parse(text):{}}catch{}
    if(!response.ok)throw new Error(result?.error||'Published question bank is unavailable.');
    return Array.isArray(result?.questions)?result.questions:[];
  }

  async function sync(user=window.firebase?.auth?.()?.currentUser){
    if(!user){lastUser='';clearPublished();return 0}
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{
      try{
        const questions=await requestPublished(user);
        lastUser=user.uid||'';
        return applyPublished(questions);
      }catch(error){
        clearPublished();
        console.warn('[FinalForge] Published question bank unavailable.',error?.message||error);
        return 0;
      }finally{syncPromise=null}
    })();
    return syncPromise;
  }

  function bindAuth(){
    const auth=window.firebase?.apps?.length?window.firebase.auth():null;
    if(!auth?.onAuthStateChanged)return false;
    auth.onAuthStateChanged(user=>{
      if(!user){lastUser='';clearPublished();return}
      if(user.uid!==lastUser)void sync(user);
    });
    return true;
  }

  addEventListener('finalforge-ready',()=>{if(!bindAuth())setTimeout(bindAuth,120)},{once:true});
  addEventListener('finalforge-question-bank-refresh',()=>void sync());
  addEventListener('pageshow',()=>{const user=window.firebase?.auth?.()?.currentUser;if(user&&user.uid!==lastUser)void sync(user)},{passive:true});

  window.FinalForgeQuestionBankV11=Object.freeze({sync,clearPublished,applyPublished});
})();