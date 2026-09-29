/* FinalForge Account Security Center v1 — event-driven Firebase account recovery and session controls. */
(()=>{
  'use strict';
  if(window.FINALFORGE_ACCOUNT_SECURITY_V1)return;
  window.FINALFORGE_ACCOUNT_SECURITY_V1=Object.freeze({version:'1.0.0'});

  const $=(selector,root=document)=>root.querySelector(selector);
  const RECOVERY_COOLDOWN_MS=60000;
  const PERSISTENCE_KEY='finalforge_security_persistence_v1';
  let recoveryUntil=0;
  let recoveryTicker=0;
  let authUnsubscribe=null;

  const icon={
    shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.8 2.8 8.4 7 10 4.2-1.6 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    key:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2"/></svg>',
    device:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.8-4M4 5v5h5M4 13a8 8 0 0 0 14.8 4M20 19v-5h-5"/></svg>',
    logout:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4m4-4H9"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  };

  function auth(){
    try{return window.firebase?.apps?.length?window.firebase.auth():null}catch{return null}
  }

  function safeDate(value){
    if(!value)return'Not available';
    try{
      const date=new Date(value);
      if(Number.isNaN(date.getTime()))return'Not available';
      return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date);
    }catch{return'Not available'}
  }

  function securityStatus(message,type='info'){
    const box=$('#ffSecurityStatus');
    if(!box)return;
    box.hidden=!message;
    box.dataset.state=type;
    box.textContent=message||'';
  }

  function setBusy(button,on,label){
    if(!button)return;
    if(on){
      button.dataset.label=button.textContent;
      button.disabled=true;
      button.setAttribute('aria-busy','true');
      if(label)button.textContent=label;
    }else{
      button.disabled=false;
      button.removeAttribute('aria-busy');
      if(button.dataset.label){button.textContent=button.dataset.label;delete button.dataset.label}
    }
  }

  function ensureSecurityCenter(){
    if($('#ffSecurityCenter'))return $('#ffSecurityCenter');
    const overlay=document.createElement('div');
    overlay.id='ffSecurityCenter';
    overlay.className='ff-security-overlay';
    overlay.hidden=true;
    overlay.innerHTML=`
      <section class="ff-security-dialog" role="dialog" aria-modal="true" aria-labelledby="ffSecurityTitle">
        <header class="ff-security-header">
          <div class="ff-security-titlelockup"><span class="ff-security-brandicon">${icon.shield}</span><div><span class="ff-security-eyebrow">Account protection</span><h2 id="ffSecurityTitle">Security & recovery</h2><p>Manage password recovery and this browser session without exposing your credentials.</p></div></div>
          <button class="ff-security-close" id="ffSecurityClose" type="button" aria-label="Close security settings">${icon.close}</button>
        </header>
        <div class="ff-security-status" id="ffSecurityStatus" role="status" aria-live="polite" hidden></div>
        <div class="ff-security-grid">
          <article class="ff-security-card ff-security-identity">
            <div class="ff-security-cardhead"><span>${icon.shield}</span><div><b>Verified identity</b><small>Firebase account status</small></div></div>
            <dl class="ff-security-facts">
              <div><dt>Email</dt><dd id="ffSecurityEmail">—</dd></div>
              <div><dt>Email status</dt><dd><span class="ff-security-badge is-safe" id="ffSecurityVerified">Checking…</span></dd></div>
              <div><dt>Account type</dt><dd id="ffSecurityRole">FinalForge account</dd></div>
              <div><dt>Last sign-in</dt><dd id="ffSecurityLastSignIn">—</dd></div>
              <div><dt>Account created</dt><dd id="ffSecurityCreated">—</dd></div>
            </dl>
          </article>

          <article class="ff-security-card">
            <div class="ff-security-cardhead"><span>${icon.key}</span><div><b>Password & recovery</b><small>Use your verified mailbox</small></div></div>
            <p class="ff-security-copy">FinalForge never displays or stores your password. A reset link is sent only through Firebase Authentication to your account email.</p>
            <button class="ff-security-action primary" id="ffSecurityReset" type="button">${icon.mail}<span>Send password reset email</span></button>
            <p class="ff-security-note">Completing a Firebase password reset invalidates existing refresh-token sessions, which is useful if a device is lost or you suspect account access.</p>
          </article>

          <article class="ff-security-card">
            <div class="ff-security-cardhead"><span>${icon.device}</span><div><b>Browser session</b><small>Choose how long this device remembers you</small></div></div>
            <div class="ff-security-segment" role="group" aria-label="Session persistence">
              <button type="button" data-security-persistence="local">Remember this device</button>
              <button type="button" data-security-persistence="session">This browser session only</button>
            </div>
            <p class="ff-security-note" id="ffSecurityPersistenceNote">Changing this affects this browser only. It does not expose your password.</p>
          </article>

          <article class="ff-security-card">
            <div class="ff-security-cardhead"><span>${icon.refresh}</span><div><b>Session health</b><small>Refresh Firebase identity state</small></div></div>
            <button class="ff-security-action" id="ffSecurityRefresh" type="button">${icon.refresh}<span>Refresh secure session</span></button>
            <button class="ff-security-action danger" id="ffSecuritySignOut" type="button">${icon.logout}<span>Sign out this device</span></button>
          </article>
        </div>
        <footer class="ff-security-footer"><span><i></i>Firebase-authenticated session</span><span>FinalForge · Security Center</span></footer>
      </section>`;
    document.body.appendChild(overlay);

    $('#ffSecurityClose')?.addEventListener('click',closeSecurityCenter);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeSecurityCenter()});
    $('#ffSecurityReset')?.addEventListener('click',()=>void sendRecovery());
    $('#ffSecurityRefresh')?.addEventListener('click',()=>void refreshSession());
    $('#ffSecuritySignOut')?.addEventListener('click',()=>void signOutCurrent());
    overlay.querySelectorAll('[data-security-persistence]').forEach(button=>button.addEventListener('click',()=>void setPersistence(button.dataset.securityPersistence,button)));
    return overlay;
  }

  async function refreshIdentityView(){
    const client=auth();
    const user=client?.currentUser;
    if(!user)return false;
    try{await user.reload()}catch{}
    const fresh=client.currentUser||user;
    let role='Student';
    try{
      const token=await fresh.getIdTokenResult(false);
      if(token?.claims?.admin===true)role='Administrator';
    }catch{}
    const studentId=String(fresh.email||'').split('@')[0].toUpperCase();
    if($('#ffSecurityEmail'))$('#ffSecurityEmail').textContent=fresh.email||'Not available';
    if($('#ffSecurityVerified')){
      $('#ffSecurityVerified').textContent=fresh.emailVerified?'Verified':'Verification required';
      $('#ffSecurityVerified').classList.toggle('is-safe',fresh.emailVerified);
      $('#ffSecurityVerified').classList.toggle('is-warning',!fresh.emailVerified);
    }
    if($('#ffSecurityRole'))$('#ffSecurityRole').textContent=role==='Student'&&/^IT\d{8}$/.test(studentId)?`Student · ${studentId}`:role;
    if($('#ffSecurityLastSignIn'))$('#ffSecurityLastSignIn').textContent=safeDate(fresh.metadata?.lastSignInTime);
    if($('#ffSecurityCreated'))$('#ffSecurityCreated').textContent=safeDate(fresh.metadata?.creationTime);
    updatePersistenceButtons();
    return true;
  }

  function updatePersistenceButtons(){
    let mode='local';
    try{mode=localStorage.getItem(PERSISTENCE_KEY)||'local'}catch{}
    document.querySelectorAll('[data-security-persistence]').forEach(button=>{
      const active=button.dataset.securityPersistence===mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  async function sendRecovery(){
    const client=auth();
    const user=client?.currentUser;
    const button=$('#ffSecurityReset');
    if(!client||!user?.email){securityStatus('Sign in again before requesting password recovery.','error');return}
    if(Date.now()<recoveryUntil)return;
    setBusy(button,true,'Sending…');
    securityStatus('');
    try{
      const settings={url:`${location.origin}${location.pathname}`,handleCodeInApp:false};
      try{await client.sendPasswordResetEmail(user.email,settings)}
      catch(error){
        if(['auth/unauthorized-continue-uri','auth/invalid-continue-uri','auth/missing-continue-uri'].includes(error?.code))await client.sendPasswordResetEmail(user.email);
        else throw error;
      }
      recoveryUntil=Date.now()+RECOVERY_COOLDOWN_MS;
      securityStatus(`Password reset email requested for ${user.email}. Check Inbox and Junk/Spam. Complete the reset from your SLIIT mailbox, then sign in again.`,'success');
      startRecoveryCooldown(button);
    }catch(error){
      const code=String(error?.code||'');
      const message=code.includes('too-many-requests')?'Too many recovery attempts. Wait a few minutes and try again.':code.includes('network-request-failed')?'Network error. Check your connection and try again.':'Password recovery is temporarily unavailable. Please try again.';
      securityStatus(message,'error');
      setBusy(button,false);
    }
  }

  function startRecoveryCooldown(button){
    clearInterval(recoveryTicker);
    const tick=()=>{
      const seconds=Math.max(0,Math.ceil((recoveryUntil-Date.now())/1000));
      if(seconds>0){button.disabled=true;button.textContent=`Reset email sent · ${seconds}s`}
      else{clearInterval(recoveryTicker);recoveryTicker=0;button.disabled=false;button.innerHTML=`${icon.mail}<span>Send password reset email</span>`}
    };
    tick();
    recoveryTicker=setInterval(tick,1000);
  }

  async function setPersistence(mode,button){
    const client=auth();
    if(!client?.currentUser||!client.setPersistence)return securityStatus('Session settings are unavailable right now.','error');
    if(!['local','session'].includes(mode))return;
    setBusy(button,true,'Updating…');
    try{
      const persistence=mode==='local'?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION;
      await client.setPersistence(persistence);
      try{localStorage.setItem(PERSISTENCE_KEY,mode)}catch{}
      updatePersistenceButtons();
      securityStatus(mode==='local'?'This browser will remember your FinalForge session until you sign out.':'This sign-in will be limited to this browser session.','success');
    }catch{securityStatus('Could not update this browser session setting. Please try again.','error')}
    finally{setBusy(button,false)}
  }

  async function refreshSession(){
    const client=auth();
    const user=client?.currentUser;
    const button=$('#ffSecurityRefresh');
    if(!user)return securityStatus('Sign in again to refresh your session.','error');
    setBusy(button,true,'Refreshing…');
    try{
      await user.reload();
      await (client.currentUser||user).getIdToken(true);
      await refreshIdentityView();
      securityStatus('Secure Firebase session refreshed successfully.','success');
    }catch{securityStatus('Could not refresh the secure session. Check your connection and try again.','error')}
    finally{setBusy(button,false)}
  }

  async function signOutCurrent(){
    securityStatus('Signing out this device…','info');
    if(typeof window.finalforgeSignOut==='function')return window.finalforgeSignOut();
    try{await auth()?.signOut()}finally{location.reload()}
  }

  function openSecurityCenter(){
    const client=auth();
    if(!client?.currentUser){window.toast?.('Sign in to manage security settings');return}
    const overlay=ensureSecurityCenter();
    overlay.hidden=false;
    document.body.classList.add('ff-security-open');
    $('#accountMenu')?.classList.remove('open');
    securityStatus('');
    void refreshIdentityView();
    requestAnimationFrame(()=>$('#ffSecurityClose')?.focus());
  }

  function closeSecurityCenter(){
    const overlay=$('#ffSecurityCenter');
    if(overlay)overlay.hidden=true;
    document.body.classList.remove('ff-security-open');
    $('#accountChip')?.focus?.();
  }

  function decorateAccountMenu(){
    const menu=$('#accountMenuBody');
    if(!menu||menu.querySelector('[data-finalforge-security]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='account-menu-btn';
    button.dataset.finalforgeSecurity='1';
    button.innerHTML=`<span class="ff-menu-security-icon">${icon.shield}</span><span>Security & recovery</span>`;
    button.addEventListener('click',openSecurityCenter);
    const danger=menu.querySelector('.account-menu-btn.danger');
    if(danger)menu.insertBefore(button,danger);else menu.appendChild(button);
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('#ffSecurityCenter')?.hidden)closeSecurityCenter();
  });
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#accountChip'))setTimeout(decorateAccountMenu,0);
  },true);

  window.finalforgeOpenSecurityCenter=openSecurityCenter;
  window.finalforgeCloseSecurityCenter=closeSecurityCenter;

  function boot(){
    ensureSecurityCenter();
    const client=auth();
    if(!client)return;
    authUnsubscribe=client.onAuthStateChanged(user=>{
      if(!user)return;
      setTimeout(()=>{decorateAccountMenu();void refreshIdentityView()},80);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  addEventListener('pagehide',()=>{try{authUnsubscribe?.()}catch{};clearInterval(recoveryTicker)},{once:true});
})();
