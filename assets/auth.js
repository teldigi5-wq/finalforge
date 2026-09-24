/* FinalForge V5 — SLIIT email verification, Student ID login, admin role, cloud progress sync */
(() => {
  const cfg = window.FINALFORGE_FIREBASE || {enabled:false};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const gate = $('#authGate');
  const localPreviewAllowed = location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(location.hostname);
  let loginRole='student', currentProfile=null, syncTimer=null, db=null, auth=null, pendingVerificationUser=null;
  const originalSetItem = localStorage.setItem.bind(localStorage);

  const normalizeStudentId = v => String(v||'').trim().toUpperCase().replace(/\s+/g,'');
  const validStudentId = id => /^IT\d{8}$/.test(normalizeStudentId(id));
  const studentEmail = id => `${normalizeStudentId(id).toLowerCase()}@my.sliit.lk`;
  const setAlert=(msg,type='error')=>{const a=$('#authAlert'); if(!a)return; a.hidden=!msg; a.className=`auth-alert ${type}`; a.textContent=msg||'';};
  const busy=(form,on)=>form?.querySelectorAll('button,input').forEach(el=>el.disabled=!!on);
  const fmtDate=v=>{try{const d=v?.toDate?v.toDate():new Date(v);return isNaN(d)?'—':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(d)}catch{return '—'}};

  window.togglePassword=(id,b)=>{const x=document.getElementById(id);if(!x)return;x.type=x.type==='password'?'text':'password';b.textContent=x.type==='password'?'👁':'🙈'};
  window.showAuthView=(name)=>{setAlert(''); $$('.auth-view').forEach(x=>x.classList.remove('active')); const id={login:'loginForm',signup:'signupForm',verify:'verifyForm',reset:'resetForm'}[name]||'loginForm'; $('#'+id)?.classList.add('active'); $('#loginTab')?.classList.toggle('active',name==='login'); $('#signupTab')?.classList.toggle('active',name==='signup');};
  window.setLoginRole=(role)=>{loginRole=role;$$('.auth-role-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.role===role));const label=$('#loginIdentityLabel'),input=$('#loginIdentity'),forgot=$('#forgotBtn');if(role==='admin'){label.firstChild.textContent='Admin email';input.placeholder='name@my.sliit.lk';input.type='email';forgot.style.display='none'}else{label.firstChild.textContent='Student ID';input.placeholder='IT26xxxxxx';input.type='text';forgot.style.display='inline-flex'}};
  window.toggleAccountMenu=()=>$('#accountMenu')?.classList.toggle('open');
  addEventListener('click',e=>{if(!e.target.closest('.top-account-wrap'))$('#accountMenu')?.classList.remove('open')});

  function showApp(profile,user,preview=false){
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
  function applySnapshot(snap){if(!snap)return;Object.entries(snap).forEach(([k,v])=>{if(k.startsWith('finalforge_')&&typeof v==='string')originalSetItem(k,v)});try{renderModules?.();renderHome?.();renderPlanner?.();renderPractice?.()}catch{}}
  async function pullOrPush(){
    if(!auth?.currentUser||currentProfile?.role!=='student')return;
    const ref=db.collection('progress').doc(auth.currentUser.uid),doc=await ref.get();
    if(doc.exists&&doc.data().snapshot){applySnapshot(doc.data().snapshot);$('#syncState').textContent='☁️ Synced'} else await pushCloud();
  }
  async function pushCloud(){
    if(!auth?.currentUser||currentProfile?.role!=='student')return;
    try{await db.collection('progress').doc(auth.currentUser.uid).set({snapshot:snapshotLocal(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});$('#syncState').textContent='☁️ Synced'}catch{$('#syncState').textContent='☁️ Offline'}
  }
  function scheduleSync(delay=700){if(!auth?.currentUser||currentProfile?.role!=='student')return;$('#syncState').textContent='☁️ Saving…';clearTimeout(syncTimer);syncTimer=setTimeout(pushCloud,delay)}
  localStorage.setItem=function(k,v){originalSetItem(k,v);if(String(k).startsWith('finalforge_'))scheduleSync();};
  window.forceCloudSync=async()=>{await pushCloud();window.toast?.('Cloud progress synced')};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pushCloud()});
  addEventListener('pagehide',()=>{pushCloud()});

  async function loadProfile(user){
    const token=await user.getIdTokenResult(true);
    if(token.claims.admin)return {role:'admin',email:user.email};
    const doc=await db.collection('profiles').doc(user.uid).get();return doc.exists?doc.data():null;
  }
  async function touchLogin(user,profile){if(profile?.role!=='student')return;try{await db.collection('profiles').doc(user.uid).set({lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch{}}

  async function finalizeVerifiedStudent(user){
    await user.reload();
    if(!user.emailVerified) throw new Error('Verify your SLIIT email before continuing.');
    const email=(user.email||'').toLowerCase();
    const local=email.split('@')[0];
    const id=normalizeStudentId(local);
    if(!validStudentId(id)||email!==studentEmail(id)) throw new Error('This account is not linked to a valid Student ID email.');
    const claim=db.collection('student_claims').doc(id), profile=db.collection('profiles').doc(user.uid);
    const existing=await profile.get();
    if(!existing.exists){
      const batch=db.batch();
      batch.set(claim,{studentId:id,uid:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      batch.set(profile,{role:'student',studentId:id,sliitEmail:email,emailVerified:true,disabled:false,createdAt:firebase.firestore.FieldValue.serverTimestamp(),lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()});
      await batch.commit();
    } else {
      await profile.set({emailVerified:true,lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }
    const p=(await profile.get()).data();
    if(p?.disabled){await auth.signOut();throw new Error('This student account is disabled. Contact the administrator.');}
    return p;
  }

  function showVerification(user){
    pendingVerificationUser=user;showAuthView('verify');
    $('#verifyEmail').textContent=user?.email||'';
  }

  async function loginStudent(id,password){
    id=normalizeStudentId(id);if(!validStudentId(id))throw new Error('Enter a valid Student ID.');
    const cred=await auth.signInWithEmailAndPassword(studentEmail(id),password);
    if(!cred.user.emailVerified){showVerification(cred.user);throw Object.assign(new Error('Verification email required.'),{silent:true});}
    const profile=await finalizeVerifiedStudent(cred.user);
    if(!profile||profile.role!=='student'||profile.studentId!==id){await auth.signOut();throw new Error('Student account profile is invalid.');}
    return {user:cred.user,profile};
  }
  async function loginAdmin(email,password){
    const cred=await auth.signInWithEmailAndPassword(String(email||'').trim(),password);const profile=await loadProfile(cred.user);
    if(profile?.role!=='admin'){await auth.signOut();throw new Error('This account does not have administrator access.');}return {user:cred.user,profile};
  }

  $('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');busy(e.currentTarget,true);try{const id=$('#loginIdentity').value,p=$('#loginPassword').value;const r=loginRole==='admin'?await loginAdmin(id,p):await loginStudent(id,p);await touchLogin(r.user,r.profile);showApp(r.profile,r.user);await pullOrPush()}catch(err){if(!err?.silent)setAlert(humanError(err))}finally{busy(e.currentTarget,false)}});

  $('#signupStudentId')?.addEventListener('input',e=>{const id=normalizeStudentId(e.target.value);const out=$('#derivedEmail');if(out)out.value=validStudentId(id)?studentEmail(id):'';});
  $('#signupForm')?.addEventListener('submit',async e=>{
    e.preventDefault();setAlert('');
    const id=normalizeStudentId($('#signupStudentId').value),pw=$('#signupPassword').value,pw2=$('#signupPassword2').value;
    if(!validStudentId(id))return setAlert('Student ID format is invalid.');
    if(pw.length<8)return setAlert('Password must contain at least 8 characters.');
    if(pw!==pw2)return setAlert('Passwords do not match.');
    busy(e.currentTarget,true);
    try{
      const cred=await auth.createUserWithEmailAndPassword(studentEmail(id),pw);
      await cred.user.updateProfile({displayName:id});
      await cred.user.sendEmailVerification({url:location.origin+location.pathname+'?verified=1',handleCodeInApp:false});
      localStorage.setItem('finalforge_pending_student',id);
      showVerification(cred.user);
      setAlert(`Verification email sent to ${studentEmail(id)}. Open that SLIIT mailbox and verify the account.`, 'success');
    }catch(err){setAlert(humanError(err))}finally{busy(e.currentTarget,false)}
  });

  $('#verifyCheckBtn')?.addEventListener('click',async()=>{
    const u=auth.currentUser||pendingVerificationUser;if(!u)return showAuthView('login');setAlert('');
    try{await u.reload();if(!u.emailVerified)return setAlert('Email is not verified yet. Open the verification link in your SLIIT mailbox, then try again.');const p=await finalizeVerifiedStudent(u);localStorage.removeItem('finalforge_pending_student');showApp(p,u);await pullOrPush();window.toast?.('Email verified. Welcome to FinalForge.')}catch(err){setAlert(humanError(err))}
  });
  $('#verifyResendBtn')?.addEventListener('click',async()=>{const u=auth.currentUser||pendingVerificationUser;if(!u)return;try{await u.sendEmailVerification({url:location.origin+location.pathname+'?verified=1',handleCodeInApp:false});setAlert(`Verification email resent to ${u.email}.`,'success')}catch(err){setAlert(humanError(err))}});

  $('#resetForm')?.addEventListener('submit',async e=>{e.preventDefault();setAlert('');const id=normalizeStudentId($('#resetStudentId').value);if(!validStudentId(id))return setAlert('Enter a valid Student ID.');busy(e.currentTarget,true);try{await auth.sendPasswordResetEmail(studentEmail(id),{url:location.origin+location.pathname});setAlert(`Password reset email sent to ${studentEmail(id)}.`,'success')}catch(err){setAlert(humanError(err))}finally{busy(e.currentTarget,false)}});

  window.finalforgeSignOut=async()=>{try{await pushCloud()}catch{}await auth.signOut();location.reload()};

  function humanError(err){const c=err?.code||'',m=err?.message||String(err||'Authentication failed.');if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found'))return 'Student ID/email or password is incorrect.';if(c.includes('too-many-requests'))return 'Too many attempts. Try again later.';if(c.includes('email-already-in-use'))return 'This Student ID already has an account. Log in or reset the password.';if(c.includes('weak-password'))return 'Choose a stronger password with at least 8 characters.';if(c.includes('network-request-failed'))return 'Network error. Check your connection and try again.';if(c==='permission-denied'||c.includes('permission-denied'))return 'This Student ID is not approved, has already been claimed, or does not match the verified SLIIT email.';return m.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?$/,'');}

  async function adminRows(){const q=await db.collection('profiles').where('role','==','student').limit(500).get();return q.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>(a.studentId||'').localeCompare(b.studentId||''));}
  let adminCache=[];
  window.refreshAdminDashboard=async()=>{if(currentProfile?.role!=='admin')return;const body=$('#adminUsersBody');body.innerHTML='<tr><td colspan="4">Loading…</td></tr>';try{adminCache=await adminRows();renderAdminRows();const disabled=adminCache.filter(x=>x.disabled).length;$('#adminStats').innerHTML=`<div class="card stat"><span class="muted small">Registered students</span><strong>${adminCache.length}</strong><span class="muted small">Firebase profiles</span></div><div class="card stat"><span class="muted small">Active</span><strong>${adminCache.length-disabled}</strong><span class="muted small">Can sign in</span></div><div class="card stat"><span class="muted small">Disabled</span><strong>${disabled}</strong><span class="muted small">Blocked in app</span></div><div class="card stat"><span class="muted small">Verification</span><strong>Email</strong><span class="muted small">SLIIT mailbox only</span></div>`}catch(e){body.innerHTML=`<tr><td colspan="4">${humanError(e)}</td></tr>`}};
  function renderAdminRows(){const term=($('#adminSearch')?.value||'').toLowerCase(),rows=adminCache.filter(x=>!term||`${x.studentId} ${x.sliitEmail}`.toLowerCase().includes(term));$('#adminUsersBody').innerHTML=rows.map(x=>`<tr><td><b>${x.studentId||'—'}</b></td><td>${x.sliitEmail||'—'}</td><td><span class="pill ${x.emailVerified?'status-active':'status-disabled'}">${x.emailVerified?'Verified':'Pending'}</span></td><td>${fmtDate(x.lastLoginAt)}</td></tr>`).join('')||'<tr><td colspan="4">No matching students.</td></tr>'}
  $('#adminSearch')?.addEventListener('input',renderAdminRows);
  const oldGo=window.go;window.go=function(id){oldGo(id);if(id==='admin')refreshAdminDashboard()};

  async function boot(){
    if(!cfg.enabled){
      $('#authConfigNote').hidden=false;$('#authConfigNote').innerHTML=`<b>Firebase setup required.</b><br>Real SLIIT email verification and cloud accounts are intentionally disabled until <code>assets/firebase-config.js</code> is configured.${localPreviewAllowed?'<br><button class="btn" id="previewBtn" type="button" style="margin-top:10px">Open local preview</button>':''}`;
      $('#previewBtn')?.addEventListener('click',()=>showApp({role:'student',studentId:'PREVIEW'},null,true));return;
    }
    firebase.initializeApp(cfg.config);auth=firebase.auth();db=firebase.firestore();
    auth.onAuthStateChanged(async user=>{
      if(!user){document.body.classList.add('auth-pending');gate?.classList.remove('hidden');return;}
      try{
        const token=await user.getIdTokenResult(true);
        if(token.claims.admin){showApp({role:'admin',email:user.email},user);return;}
        if(!user.emailVerified){showVerification(user);return;}
        const p=await finalizeVerifiedStudent(user);showApp(p,user);await pullOrPush();
      }catch(err){setAlert(humanError(err));try{await auth.signOut()}catch{}}
    });
  }
  boot();
})();
