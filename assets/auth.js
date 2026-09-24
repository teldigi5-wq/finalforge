/* FinalForge V4 — Firebase phone OTP, Student ID login, admin role, cloud progress sync */
(() => {
  const cfg = window.FINALFORGE_FIREBASE || {enabled:false};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const gate = $('#authGate');
  const localPreviewAllowed = location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(location.hostname);
  let loginRole='student', signupDraft=null, confirmationResult=null, resetConfirmation=null, currentProfile=null, syncTimer=null, db=null, auth=null;
  let originalSetItem = localStorage.setItem.bind(localStorage);

  const normalizeStudentId = v => String(v||'').trim().toUpperCase().replace(/\s+/g,'');
  const studentLoginEmail = id => `${normalizeStudentId(id).toLowerCase()}@auth.finalforge.local`;
  const normalizePhone = v => {let s=String(v||'').replace(/[\s()-]/g,''); if(/^0\d{9}$/.test(s)) return '+94'+s.slice(1); if(/^94\d{9}$/.test(s)) return '+'+s; return s;};
  const validStudentId = id => /^IT\d{8}$/.test(normalizeStudentId(id));
  const validSliitEmail = e => /^[^\s@]+@my\.sliit\.lk$/i.test(String(e||'').trim());
  const setAlert=(msg,type='error')=>{const a=$('#authAlert'); if(!a)return; a.hidden=!msg; a.className=`auth-alert ${type}`; a.textContent=msg||'';};
  const busy=(form,on)=>form?.querySelectorAll('button,input').forEach(el=>el.disabled=!!on);
  const maskPhone=p=>p?`${p.slice(0,4)}••••${p.slice(-3)}`:'—';
  const fmtDate=v=>{try{const d=v?.toDate?v.toDate():new Date(v);return isNaN(d)?'—':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(d)}catch{return '—'}};

  window.togglePassword=(id,b)=>{const x=document.getElementById(id);if(!x)return;x.type=x.type==='password'?'text':'password';b.textContent=x.type==='password'?'👁':'🙈'};
  window.showAuthView=(name)=>{setAlert(''); $$('.auth-view').forEach(x=>x.classList.remove('active')); const el=$('#'+({login:'loginForm',signup:'signupForm',otp:'otpForm',reset:'resetForm',resetotp:'resetOtpForm'}[name]||'loginForm')); el?.classList.add('active'); $('#loginTab')?.classList.toggle('active',name==='login'); $('#signupTab')?.classList.toggle('active',name==='signup');};
  window.setLoginRole=(role)=>{loginRole=role;$$('.auth-role-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.role===role));const label=$('#loginIdentityLabel');const input=$('#loginIdentity');const forgot=$('#forgotBtn');if(role==='admin'){label.firstChild.textContent='Admin email';input.placeholder='name@my.sliit.lk';input.type='email';forgot.style.display='none'}else{label.firstChild.textContent='Student ID';input.placeholder='IT26xxxxxx';input.type='text';forgot.style.display='inline-flex'}};
  window.toggleAccountMenu=()=>$('#accountMenu')?.classList.toggle('open');
  addEventListener('click',e=>{if(!e.target.closest('.top-account-wrap'))$('#accountMenu')?.classList.remove('open')});

  function showApp(profile, user, preview=false){
    document.body.classList.remove('auth-pending'); gate?.classList.add('hidden'); currentProfile=profile;
    const primary=preview?'Preview Mode':profile?.role==='admin'?'Administrator':profile?.studentId||'Student';
    const secondary=preview?'Auth not connected':profile?.role==='admin'?(user?.email||'Admin'):(profile?.sliitEmail||user?.email||'');
    $('#accountPrimary').textContent=primary; $('#accountSecondary').textContent=secondary;
    $('#accountChip .account-avatar').textContent=(primary[0]||'S').toUpperCase();
    $('#accountMenuBody').innerHTML=preview?`<div class="account-menu-head"><b>Local preview</b><span>Configure Firebase before public launch.</span></div>`:`<div class="account-menu-head"><b>${primary}</b><span>${secondary}</span></div><button class="account-menu-btn" onclick="go('home');toggleAccountMenu()">🏠 Dashboard</button>${profile?.role==='admin'?`<button class="account-menu-btn" onclick="go('admin');toggleAccountMenu()">🛡️ Admin console</button>`:''}<button class="account-menu-btn" onclick="forceCloudSync()">☁️ Sync now</button><button class="account-menu-btn danger" onclick="finalforgeSignOut()">↪ Sign out</button>`;
    if(profile?.role==='admin') ensureAdminNav();
    if(window.finalforgeRefreshEffects) setTimeout(window.finalforgeRefreshEffects,60);
  }

  function ensureAdminNav(){
    if(document.querySelector('[data-go="admin"]')) return;
    const btn=`<button data-go="admin" onclick="go('admin')">🛡️ <span>Admin</span></button>`;
    $('#nav')?.insertAdjacentHTML('beforeend',btn); $('#mobileNav')?.insertAdjacentHTML('beforeend',btn);
  }

  function snapshotLocal(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('finalforge_') && k!=='finalforge_cloud_meta') out[k]=localStorage.getItem(k)}return out;}
  function applySnapshot(snap){if(!snap)return;Object.entries(snap).forEach(([k,v])=>{if(k.startsWith('finalforge_')&&typeof v==='string')originalSetItem(k,v)}); try{renderModules();renderHome();renderPlanner();renderPractice?.()}catch{} }
  async function pullOrPush(){
    if(!auth?.currentUser||currentProfile?.role!=='student')return;
    const ref=db.collection('progress').doc(auth.currentUser.uid), doc=await ref.get();
    if(doc.exists && doc.data().snapshot){applySnapshot(doc.data().snapshot);$('#syncState').textContent='☁️ Synced'}
    else await pushCloud();
  }
  async function pushCloud(){
    if(!auth?.currentUser||currentProfile?.role!=='student')return;
    try{await db.collection('progress').doc(auth.currentUser.uid).set({snapshot:snapshotLocal(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});$('#syncState').textContent='☁️ Synced'}catch(e){$('#syncState').textContent='☁️ Offline'}
  }
  function scheduleSync(){if(!auth?.currentUser||currentProfile?.role!=='student')return;$('#syncState').textContent='☁️ Saving…';clearTimeout(syncTimer);syncTimer=setTimeout(pushCloud,1200)}
  localStorage.setItem=function(k,v){originalSetItem(k,v);if(String(k).startsWith('finalforge_'))scheduleSync();};
  window.forceCloudSync=async()=>{await pushCloud();window.toast?.('Cloud progress synced')};

  async function loadProfile(user){
    const token=await user.getIdTokenResult(true);
    if(token.claims.admin){return {role:'admin',email:user.email};}
    const doc=await db.collection('profiles').doc(user.uid).get(); if(!doc.exists)return null; return doc.data();
  }
  async function touchLogin(user,profile){if(profile?.role!=='student')return;try{await db.collection('profiles').doc(user.uid).set({lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch{}}

  function initRecaptcha(containerId, reset=false){
    const key=reset?'__resetRecaptcha':'__signupRecaptcha';
    if(window[key]){try{window[key].clear()}catch{}};
    window[key]=new firebase.auth.RecaptchaVerifier(containerId,{size:'normal'}); return window[key];
  }

  async function loginStudent(id,password){
    id=normalizeStudentId(id); if(!validStudentId(id))throw new Error('Enter a valid Student ID.');
    const cred=await auth.signInWithEmailAndPassword(studentLoginEmail(id),password); const profile=await loadProfile(cred.user);
    if(!profile||profile.role!=='student'||profile.studentId!==id||profile.disabled===true){await auth.signOut();throw new Error(profile?.disabled?'This student account is disabled. Contact the administrator.':'Student account profile is invalid.');}
    return {user:cred.user,profile};
  }
  async function loginAdmin(email,password){
    const cred=await auth.signInWithEmailAndPassword(String(email||'').trim(),password); const profile=await loadProfile(cred.user);
    if(profile?.role!=='admin'){await auth.signOut();throw new Error('This account does not have administrator access.');}return {user:cred.user,profile};
  }

  $('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');busy(e.currentTarget,true);try{const id=$('#loginIdentity').value,p=$('#loginPassword').value;const r=loginRole==='admin'?await loginAdmin(id,p):await loginStudent(id,p);await touchLogin(r.user,r.profile);showApp(r.profile,r.user);await pullOrPush()}catch(err){setAlert(humanError(err))}finally{busy(e.currentTarget,false)}});

  $('#signupForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');const id=normalizeStudentId($('#signupStudentId').value),email=$('#signupEmail').value.trim().toLowerCase(),phone=normalizePhone($('#signupPhone').value),pw=$('#signupPassword').value,pw2=$('#signupPassword2').value;
    if(!validStudentId(id))return setAlert('Student ID format is invalid.'); if(!validSliitEmail(email))return setAlert('Use your @my.sliit.lk email address.'); if(!/^\+947\d{8}$/.test(phone))return setAlert('Enter a valid Sri Lankan mobile number.'); if(pw.length<8)return setAlert('Password must contain at least 8 characters.'); if(pw!==pw2)return setAlert('Passwords do not match.');
    busy(e.currentTarget,true);try{signupDraft={id,email,phone,pw}; const verifier=initRecaptcha('recaptcha-container'); confirmationResult=await auth.signInWithPhoneNumber(phone,verifier); $('#otpDestination').textContent=`OTP sent to ${maskPhone(phone)}`; showAuthView('otp')}catch(err){setAlert(humanError(err));try{window.__signupRecaptcha?.clear()}catch{}}finally{busy(e.currentTarget,false)}});

  $('#otpForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');if(!confirmationResult||!signupDraft)return setAlert('Start signup again.');busy(e.currentTarget,true);let phoneUser=null;try{
    const r=await confirmationResult.confirm($('#otpCode').value.trim()); phoneUser=r.user;
    const synthetic=studentLoginEmail(signupDraft.id), emailCred=firebase.auth.EmailAuthProvider.credential(synthetic,signupDraft.pw); await phoneUser.linkWithCredential(emailCred); await phoneUser.updateProfile({displayName:signupDraft.id});
    const batch=db.batch(), claim=db.collection('student_claims').doc(signupDraft.id), profile=db.collection('profiles').doc(phoneUser.uid);
    batch.set(claim,{studentId:signupDraft.id,uid:phoneUser.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    batch.set(profile,{role:'student',studentId:signupDraft.id,sliitEmail:signupDraft.email,phone:signupDraft.phone,disabled:false,createdAt:firebase.firestore.FieldValue.serverTimestamp(),lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()});
    await batch.commit(); const p=(await profile.get()).data(); showApp(p,phoneUser); await pullOrPush(); window.toast?.('Account created successfully');
  }catch(err){if(phoneUser){try{await phoneUser.delete()}catch{}}; setAlert(err?.code==='permission-denied'?'This Student ID is not approved or has already been registered.':humanError(err))}finally{busy(e.currentTarget,false)}});

  $('#resetForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');const id=normalizeStudentId($('#resetStudentId').value),phone=normalizePhone($('#resetPhone').value);if(!validStudentId(id))return setAlert('Enter a valid Student ID.');if(!/^\+947\d{8}$/.test(phone))return setAlert('Enter a valid Sri Lankan mobile number.');signupDraft={id,phone};busy(e.currentTarget,true);try{resetConfirmation=await auth.signInWithPhoneNumber(phone,initRecaptcha('reset-recaptcha-container',true));showAuthView('resetotp')}catch(err){setAlert(humanError(err))}finally{busy(e.currentTarget,false)}});
  $('#resetOtpForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');busy(e.currentTarget,true);try{const r=await resetConfirmation.confirm($('#resetOtpCode').value.trim()),u=r.user;if((u.email||'').toLowerCase()!==studentLoginEmail(signupDraft.id)){await auth.signOut();throw new Error('That mobile number is not linked to this Student ID.');}const np=$('#resetNewPassword').value;if(np.length<8)throw new Error('New password must contain at least 8 characters.');await u.updatePassword(np);await auth.signOut();showAuthView('login');setAlert('Password changed. Log in with your Student ID and new password.','success')}catch(err){setAlert(humanError(err))}finally{busy(e.currentTarget,false)}});

  window.finalforgeSignOut=async()=>{try{await pushCloud()}catch{}await auth.signOut();location.reload()};

  function humanError(err){const c=err?.code||'',m=err?.message||String(err||'Authentication failed.');if(c.includes('invalid-credential')||c.includes('wrong-password'))return 'Student ID/email or password is incorrect.';if(c.includes('too-many-requests'))return 'Too many attempts. Try again later.';if(c.includes('invalid-verification-code'))return 'The OTP code is incorrect.';if(c.includes('code-expired'))return 'The OTP has expired. Request a new code.';if(c.includes('email-already-in-use')||c.includes('credential-already-in-use'))return 'This Student ID or mobile number is already registered.';return m.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?$/,'');}

  async function adminRows(){
    const q=await db.collection('profiles').where('role','==','student').limit(500).get();return q.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>(a.studentId||'').localeCompare(b.studentId||''));
  }
  let adminCache=[];
  window.refreshAdminDashboard=async()=>{if(currentProfile?.role!=='admin')return;const body=$('#adminUsersBody');body.innerHTML='<tr><td colspan="5">Loading…</td></tr>';try{adminCache=await adminRows();renderAdminRows();const disabled=adminCache.filter(x=>x.disabled).length;$('#adminStats').innerHTML=`<div class="card stat"><span class="muted small">Registered students</span><strong>${adminCache.length}</strong><span class="muted small">Firebase profiles</span></div><div class="card stat"><span class="muted small">Active</span><strong>${adminCache.length-disabled}</strong><span class="muted small">Can sign in</span></div><div class="card stat"><span class="muted small">Disabled</span><strong>${disabled}</strong><span class="muted small">Blocked in app</span></div><div class="card stat"><span class="muted small">Access model</span><strong>OTP</strong><span class="muted small">First signup only</span></div>`}catch(e){body.innerHTML=`<tr><td colspan="5">${humanError(e)}</td></tr>`}};
  function renderAdminRows(){const term=($('#adminSearch')?.value||'').toLowerCase(),rows=adminCache.filter(x=>!term||`${x.studentId} ${x.sliitEmail}`.toLowerCase().includes(term));$('#adminUsersBody').innerHTML=rows.map(x=>`<tr><td><b>${x.studentId||'—'}</b></td><td>${x.sliitEmail||'—'}</td><td>${maskPhone(x.phone||'')}</td><td><span class="pill ${x.disabled?'status-disabled':'status-active'}">${x.disabled?'Disabled':'Active'}</span></td><td>${fmtDate(x.lastLoginAt)}</td></tr>`).join('')||'<tr><td colspan="5">No matching students.</td></tr>'}
  $('#adminSearch')?.addEventListener('input',renderAdminRows);
  const oldGo=window.go;window.go=function(id){oldGo(id);if(id==='admin')refreshAdminDashboard()};

  async function boot(){
    if(!cfg.enabled){
      $('#authConfigNote').hidden=false; $('#authConfigNote').innerHTML=`<b>Firebase setup required.</b><br>Real SMS OTP and cloud accounts are intentionally disabled until <code>assets/firebase-config.js</code> is configured.${localPreviewAllowed?'<br><button class="btn" id="previewBtn" type="button" style="margin-top:10px">Open local preview</button>':''}`;
      if(localPreviewAllowed) setTimeout(()=>$('#previewBtn')?.addEventListener('click',()=>showApp({role:'preview'},null,true)),0); return;
    }
    try{firebase.initializeApp(cfg.config);auth=firebase.auth();db=firebase.firestore();await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);auth.onAuthStateChanged(async user=>{if(!user)return;try{const profile=await loadProfile(user);if(!profile){await auth.signOut();return}if(profile.disabled){await auth.signOut();setAlert('This account is disabled.');return}showApp(profile,user);await touchLogin(user,profile);await pullOrPush()}catch(e){setAlert(humanError(e))}})}catch(e){setAlert('Authentication service could not start: '+humanError(e))}
  }
  boot();
})();
