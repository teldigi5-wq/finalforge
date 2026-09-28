/* FinalForge Auth Runtime v2 — single-owner, timeout-bounded Firebase auth and cloud sync. */
(() => {
  'use strict';

  if (window.FINALFORGE_AUTH_RUNTIME_V2) return;
  window.FINALFORGE_AUTH_RUNTIME_V2 = Object.freeze({ version: '2.0.0' });

  const cfg = window.FINALFORGE_FIREBASE || { enabled: false };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const gate = $('#authGate');
  const card = gate?.querySelector('.auth-card') || null;
  const localPreviewAllowed = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const CLOUD_PROGRESS_KEY = 'finalforge_progress';
  const originalSetItem = localStorage.setItem.bind(localStorage);

  const LIMITS = Object.freeze({ auth: 15000, profile: 12000, api: 15000, sync: 8000, boot: 12000 });

  let auth = null;
  let db = null;
  let loginRole = 'student';
  let currentProfile = null;
  let pendingVerificationUser = null;
  let syncTimer = null;
  let authUnsubscribe = null;
  let resolving = null;
  let activeOperation = null;
  let operationCounter = 0;
  let verificationTimer = null;
  let verificationCheckInFlight = false;
  let resendUntil = 0;
  let resendTicker = null;
  let bootSettled = false;

  function ensureV2Styles() {
    if (document.querySelector('link[data-finalforge-auth-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/auth-system-v2.css?v=2';
    link.dataset.finalforgeAuthV2 = '1';
    document.head.appendChild(link);
  }
  ensureV2Styles();

  function ensureRuntimeStatus() {
    if (!card || $('#authRuntimeStatus')) return;
    const status = document.createElement('div');
    status.id = 'authRuntimeStatus';
    status.className = 'ff-auth-runtime-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = '<span class="ff-auth-runtime-dot" aria-hidden="true"></span><span class="ff-auth-runtime-copy">Preparing secure sign-in…</span><button class="ff-auth-runtime-retry" id="authRuntimeRetry" type="button" hidden>Retry</button>';
    const alert = $('#authAlert');
    (alert || card.firstChild)?.before?.(status);
    $('#authRuntimeRetry')?.addEventListener('click', () => location.reload());
  }
  ensureRuntimeStatus();

  const normalizeStudentId = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const validStudentId = value => /^IT\d{8}$/.test(normalizeStudentId(value));
  const studentEmail = value => `${normalizeStudentId(value).toLowerCase()}@my.sliit.lk`;
  const normalizeEmail = value => String(value || '').trim().toLowerCase();
  const fmtDate = value => {
    try {
      const date = value?.toDate ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch { return '—'; }
  };

  function timeoutError(label) {
    const error = new Error(`${label} is taking longer than expected. Check your connection and try again.`);
    error.code = 'finalforge/timeout';
    return error;
  }

  function withTimeout(value, ms, label) {
    let timer = 0;
    const promise = Promise.resolve(value);
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError(label)), ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function humanError(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || error || 'Authentication failed.');
    if (code === 'finalforge/timeout') return message;
    if (code.includes('user-not-found')) return 'Student ID not found. Check the ID or create an account first.';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Student ID/email or password is incorrect.';
    if (code.includes('user-disabled')) return 'This account is disabled. Contact the FinalForge administrator.';
    if (code.includes('invalid-email')) return 'Enter a valid administrator email address.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes, then try again.';
    if (code.includes('email-already-in-use')) return 'This Student ID already has an account. Log in or reset the password.';
    if (code.includes('weak-password')) return 'Choose a stronger password with at least 8 characters.';
    if (code.includes('network-request-failed')) return 'Network error. Check your connection and try again.';
    if (code.includes('unauthorized-domain') || code.includes('unauthorized-continue-uri')) return 'This FinalForge address is not authorized for Firebase yet.';
    if (code === 'permission-denied' || code.includes('permission-denied')) return 'This Student ID is not approved, has already been claimed, or does not match the verified SLIIT email.';
    return message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
  }

  function setAlert(message, type = 'error') {
    const box = $('#authAlert');
    if (!box) return;
    box.hidden = !message;
    box.className = `auth-alert ${type}`;
    box.textContent = message || '';
  }

  function runtimeState(state, message, { retry = false } = {}) {
    if (card) {
      card.dataset.authState = state;
      card.setAttribute('aria-busy', String(['initializing', 'authenticating', 'working'].includes(state)));
    }
    if (gate) gate.dataset.authState = state;
    const status = $('#authRuntimeStatus');
    const copy = status?.querySelector('.ff-auth-runtime-copy');
    if (copy && message) copy.textContent = message;
    if (status) status.dataset.state = state;
    const retryButton = $('#authRuntimeRetry');
    if (retryButton) retryButton.hidden = !retry;
    const bootStatus = $('#authBootStatus');
    if (bootStatus) {
      bootStatus.hidden = state === 'ready' || state === 'idle' || state === 'verify';
      bootStatus.textContent = message || '';
      bootStatus.classList.toggle('is-error', state === 'error' || state === 'offline');
    }
  }

  function finishRestore() {
    bootSettled = true;
    document.documentElement.classList.remove('ff-auth-restoring');
    document.body?.classList.add('ff-auth-ui-ready');
  }

  function showGate() {
    document.body?.classList.add('auth-pending');
    gate?.classList.remove('hidden');
    if (gate) gate.hidden = false;
    finishRestore();
  }

  function cancelOperation() {
    operationCounter += 1;
    activeOperation = null;
    $$('.auth-view').forEach(form => {
      form.classList.remove('is-loading');
      form.setAttribute('aria-busy', 'false');
      form.querySelectorAll('button,input').forEach(element => { element.disabled = false; });
    });
  }

  function setBusy(form, on, message = '') {
    if (!form) return;
    form.classList.toggle('is-loading', Boolean(on));
    form.setAttribute('aria-busy', String(Boolean(on)));
    form.querySelectorAll('button,input').forEach(element => { element.disabled = Boolean(on); });
    const submit = form.querySelector('.auth-submit');
    if (submit) {
      if (on && message) submit.dataset.busyLabel = message;
      else delete submit.dataset.busyLabel;
    }
  }

  async function runOperation(name, form, message, work) {
    if (activeOperation) return null;
    const token = ++operationCounter;
    activeOperation = { token, name };
    setBusy(form, true, message);
    runtimeState('working', message);
    try { return await work(); }
    catch (error) {
      if (token === operationCounter) {
        const text = humanError(error);
        setAlert(text);
        runtimeState(navigator.onLine ? 'error' : 'offline', text, { retry: !navigator.onLine });
      }
      return null;
    } finally {
      if (activeOperation?.token === token) {
        activeOperation = null;
        setBusy(form, false);
        if (Date.now() < resendUntil) {
          const resend = $('#verifyResendBtn');
          if (resend) resend.disabled = true;
        }
        if (document.body.classList.contains('auth-pending')) {
          const verifyActive = $('#verifyForm')?.classList.contains('active');
          if (verifyActive) runtimeState('verify', 'Waiting for SLIIT email verification.');
          else if (navigator.onLine) runtimeState('idle', 'Secure sign-in ready.');
        }
      }
    }
  }

  window.togglePassword = (id, button) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (button) {
      const visible = input.type === 'text';
      button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
      button.classList.toggle('is-visible', visible);
    }
  };

  function copyForView(name) {
    return {
      login: ['Secure student access', 'Welcome back', 'Continue exactly where you left off.'],
      signup: ['Approved students only', 'Create your account', 'Use your Student ID and matching SLIIT mailbox.'],
      verify: ['One last step', 'Verify your SLIIT email', 'Open the verification link, then return here.'],
      reset: ['Account recovery', 'Reset your password', 'We will send the reset link to your SLIIT mailbox.']
    }[name] || ['Secure student access', 'Welcome back', 'Continue exactly where you left off.'];
  }

  function setAuthView(name, { keepAlert = false } = {}) {
    const views = { login: 'loginForm', signup: 'signupForm', verify: 'verifyForm', reset: 'resetForm' };
    const target = views[name] || views.login;
    if (!keepAlert) setAlert('');
    $$('.auth-view').forEach(view => view.classList.toggle('active', view.id === target));
    $('#loginTab')?.classList.toggle('active', name === 'login');
    $('#signupTab')?.classList.toggle('active', name === 'signup');
    if (card) card.dataset.mode = name;
    const intro = card?.querySelector('.ff-auth-intro');
    const [eyebrow, title, text] = copyForView(name);
    if (intro) {
      const e = intro.querySelector('.ff-auth-eyebrow');
      const h = intro.querySelector('h2');
      const p = intro.querySelector('p');
      if (e) e.textContent = eyebrow;
      if (h) h.textContent = title;
      if (p) p.textContent = text;
    }
    if (name === 'verify') {
      startVerificationPolling();
      runtimeState('verify', 'Waiting for SLIIT email verification.');
    } else {
      stopVerificationPolling();
      if (navigator.onLine) runtimeState('idle', 'Secure sign-in ready.');
    }
    requestAnimationFrame(() => card?.scrollTo?.({ top: 0, behavior: 'auto' }));
  }
  window.showAuthView = name => setAuthView(name);

  window.setLoginRole = role => {
    loginRole = role === 'admin' ? 'admin' : 'student';
    $$('.auth-role-toggle button').forEach(button => button.classList.toggle('active', button.dataset.role === loginRole));
    const label = $('#loginIdentityLabel');
    const input = $('#loginIdentity');
    const forgot = $('#forgotBtn');
    if (!label || !input || !forgot) return;
    const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (loginRole === 'admin') {
      if (textNode) textNode.textContent = 'Admin email';
      input.placeholder = 'name@my.sliit.lk';
      input.type = 'email';
      forgot.style.display = 'none';
    } else {
      if (textNode) textNode.textContent = 'Student ID';
      input.placeholder = 'IT26xxxxxx';
      input.type = 'text';
      forgot.style.display = 'inline-flex';
    }
  };

  window.toggleAccountMenu = () => $('#accountMenu')?.classList.toggle('open');
  addEventListener('click', event => { if (!event.target.closest('.top-account-wrap')) $('#accountMenu')?.classList.remove('open'); });

  function ensureAdminNav() {
    if (document.querySelector('[data-go="admin"]')) return;
    const button = '<button data-go="admin" onclick="go(\'admin\')">🛡️ <span>Admin</span></button>';
    $('#nav')?.insertAdjacentHTML('beforeend', button);
    $('#mobileNav')?.insertAdjacentHTML('beforeend', button);
  }

  function showApp(profile, user, preview = false) {
    cancelOperation();
    stopVerificationPolling();
    if (profile?.role === 'admin') window.finalforgeAccountStorage?.unbind?.();
    else if (profile?.role === 'student' && user?.uid) window.finalforgeAccountStorage?.bind?.(user.uid);
    currentProfile = profile;
    document.body.classList.remove('auth-pending');
    document.body.classList.add('ff-authenticated');
    gate?.classList.add('hidden');
    if (gate) gate.hidden = true;
    finishRestore();
    runtimeState('ready', 'Signed in securely.');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const primary = preview ? 'Preview Mode' : profile?.role === 'admin' ? 'Administrator' : profile?.studentId || 'Student';
    const secondary = preview ? 'Auth not connected' : profile?.role === 'admin' ? (user?.email || 'Admin') : (profile?.sliitEmail || user?.email || '');
    if ($('#accountPrimary')) $('#accountPrimary').textContent = primary;
    if ($('#accountSecondary')) $('#accountSecondary').textContent = secondary;
    const avatar = $('#accountChip .account-avatar');
    if (avatar) avatar.textContent = (primary[0] || 'S').toUpperCase();
    const menu = $('#accountMenuBody');
    if (menu) {
      menu.innerHTML = preview
        ? '<div class="account-menu-head"><b>Local preview</b><span>Configure Firebase before public launch.</span></div>'
        : `<div class="account-menu-head"><b>${primary}</b><span>${secondary}</span></div><button class="account-menu-btn" onclick="go('home');toggleAccountMenu()">🏠 Dashboard</button>${profile?.role === 'admin' ? '<button class="account-menu-btn" onclick="go(\'admin\');toggleAccountMenu()">🛡️ Admin console</button>' : ''}<button class="account-menu-btn" onclick="forceCloudSync()">☁️ Sync now</button><button class="account-menu-btn danger" onclick="finalforgeSignOut()">↪ Sign out</button>`;
    }
    if (profile?.role === 'admin') ensureAdminNav();
    if (window.finalforgeRefreshEffects) setTimeout(window.finalforgeRefreshEffects, 60);
  }

  function progressSnapshot() {
    const value = localStorage.getItem(CLOUD_PROGRESS_KEY);
    return typeof value === 'string' ? { [CLOUD_PROGRESS_KEY]: value } : {};
  }
  function sanitizeRemoteSnapshot(snapshot) {
    const value = snapshot?.[CLOUD_PROGRESS_KEY];
    return typeof value === 'string' ? { [CLOUD_PROGRESS_KEY]: value } : {};
  }
  function mergeProgressSnapshot(local, remote) {
    const left = sanitizeRemoteSnapshot(local), right = sanitizeRemoteSnapshot(remote);
    return left[CLOUD_PROGRESS_KEY] !== undefined ? left : right;
  }
  function applySnapshot(snapshot) {
    const merged = mergeProgressSnapshot(progressSnapshot(), snapshot);
    const value = merged[CLOUD_PROGRESS_KEY];
    if (typeof value === 'string') originalSetItem(CLOUD_PROGRESS_KEY, value);
    try { window.renderModules?.(); window.renderHome?.(); window.renderPlanner?.(); window.renderPractice?.(); } catch {}
  }

  async function pushCloud() {
    if (!auth?.currentUser || currentProfile?.role !== 'student' || !navigator.onLine) return false;
    try {
      const ref = db.collection('progress').doc(auth.currentUser.uid);
      const local = progressSnapshot();
      const snapshot = await withTimeout(db.runTransaction(async transaction => {
        const previous = await transaction.get(ref);
        const merged = mergeProgressSnapshot(local, previous.data()?.snapshot || {});
        const payload = { snapshot: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (previous.exists) transaction.update(ref, payload); else transaction.set(ref, payload);
        return merged;
      }), LIMITS.sync, 'Cloud progress sync');
      applySnapshot(snapshot);
      if ($('#syncState')) $('#syncState').textContent = '☁️ Synced';
      return true;
    } catch {
      if ($('#syncState')) $('#syncState').textContent = '☁️ Offline';
      return false;
    }
  }

  async function pullOrPush() {
    if (!auth?.currentUser || currentProfile?.role !== 'student' || !navigator.onLine) return false;
    try {
      const ref = db.collection('progress').doc(auth.currentUser.uid);
      const doc = await withTimeout(ref.get(), LIMITS.sync, 'Cloud progress restore');
      if (doc.exists && doc.data().snapshot) applySnapshot(doc.data().snapshot);
      return await pushCloud();
    } catch {
      if ($('#syncState')) $('#syncState').textContent = '☁️ Offline';
      return false;
    }
  }

  function scheduleSync(delay = 700) {
    if (!auth?.currentUser || currentProfile?.role !== 'student') return;
    if ($('#syncState')) $('#syncState').textContent = '☁️ Saving…';
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void pushCloud(); }, delay);
  }

  if (!window.__FINALFORGE_PROGRESS_SETITEM_V2) {
    window.__FINALFORGE_PROGRESS_SETITEM_V2 = true;
    localStorage.setItem = function finalforgeSetItem(key, value) {
      originalSetItem(key, value);
      if (String(key) === CLOUD_PROGRESS_KEY) scheduleSync();
    };
  }
  window.forceCloudSync = async () => {
    const ok = await pushCloud();
    window.toast?.(ok ? 'Cloud progress synced' : 'Cloud sync is unavailable right now');
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void pushCloud(); });
  addEventListener('pagehide', () => { void pushCloud(); });

  async function loadAdminProfile(user) {
    const token = await withTimeout(user.getIdTokenResult(true), LIMITS.profile, 'Administrator verification');
    if (token.claims.admin && token.claims.email_verified === true) return { role: 'admin', email: user.email };
    throw new Error('This account needs a verified administrator email and admin access.');
  }

  async function finalizeVerifiedStudent(user) {
    await withTimeout(user.reload(), LIMITS.profile, 'Account verification');
    const fresh = auth.currentUser || user;
    if (!fresh.emailVerified) throw new Error('Verify your SLIIT email before continuing.');
    const token = await withTimeout(fresh.getIdTokenResult(true), LIMITS.profile, 'Verified email claim refresh');
    if (token.claims.email_verified !== true) throw new Error('Verify your SLIIT email before continuing.');
    const email = normalizeEmail(fresh.email);
    const id = normalizeStudentId(email.split('@')[0]);
    if (!validStudentId(id) || email !== studentEmail(id)) throw new Error('This account is not linked to a valid Student ID email.');

    const claimRef = db.collection('student_claims').doc(id);
    const profileRef = db.collection('profiles').doc(fresh.uid);
    const profile = await withTimeout(db.runTransaction(async transaction => {
      const claimSnap = await transaction.get(claimRef);
      const profileSnap = await transaction.get(profileRef);
      if (claimSnap.exists && claimSnap.data()?.uid !== fresh.uid) {
        const error = new Error('Student ID claim is invalid.'); error.code = 'permission-denied'; throw error;
      }
      if (profileSnap.exists) {
        const data = profileSnap.data();
        if (data.role !== 'student' || data.studentId !== id || normalizeEmail(data.sliitEmail) !== email || data.emailVerified !== true || data.disabled === true) {
          const error = new Error('Student account profile is invalid or disabled.'); error.code = 'permission-denied'; throw error;
        }
        if (!claimSnap.exists) transaction.set(claimRef, { studentId: id, uid: fresh.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        transaction.set(profileRef, { lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { ...data, lastLoginAt: data.lastLoginAt };
      }
      if (!claimSnap.exists) transaction.set(claimRef, { studentId: id, uid: fresh.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      const created = { role: 'student', studentId: id, sliitEmail: email, emailVerified: true, disabled: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() };
      transaction.set(profileRef, created);
      return { ...created, createdAt: null, lastLoginAt: null };
    }), LIMITS.profile, 'Student profile verification');
    if (profile?.disabled) throw new Error('This student account is disabled. Contact the administrator.');
    return profile;
  }

  function verificationView(user, message = '') {
    pendingVerificationUser = user;
    const email = $('#verifyEmail'); if (email) email.textContent = user?.email || '';
    if (user?.email) {
      const id = normalizeStudentId(String(user.email).split('@')[0]);
      if (validStudentId(id)) localStorage.setItem('finalforge_pending_student', id);
    }
    showGate();
    setAuthView('verify', { keepAlert: Boolean(message) });
    if (message) setAlert(message, 'success');
  }

  async function resolveSignedInUser(user, source = 'auth-state') {
    if (!user) return 'login';
    if (resolving?.uid === user.uid) return resolving.promise;
    const promise = (async () => {
      showGate();
      runtimeState('authenticating', source === 'restore' ? 'Restoring your secure session…' : 'Checking your account…');
      if (!user.emailVerified) { verificationView(user); return 'verify'; }
      const token = await withTimeout(user.getIdTokenResult(true), LIMITS.profile, 'Account authorization');
      if (token.claims.admin) {
        const adminProfile = await loadAdminProfile(user);
        showApp(adminProfile, user);
        return 'app';
      }
      const profile = await finalizeVerifiedStudent(user);
      showApp(profile, user);
      void pullOrPush();
      return 'app';
    })().catch(async error => {
      setAlert(humanError(error));
      runtimeState(navigator.onLine ? 'error' : 'offline', humanError(error), { retry: true });
      try { await withTimeout(auth.signOut(), 5000, 'Sign out'); } catch {}
      showGate();
      setAuthView('login', { keepAlert: true });
      return 'error';
    }).finally(() => { if (resolving?.promise === promise) resolving = null; });
    resolving = { uid: user.uid, promise };
    return promise;
  }

  function updateSignupEmailState() {
    const id = normalizeStudentId($('#signupStudentId')?.value);
    const expected = validStudentId(id) ? studentEmail(id) : '';
    const emailInput = $('#derivedEmail');
    const idFeedback = $('#signupStudentIdFeedback');
    let emailFeedback = $('#signupEmailFeedback');
    if (emailInput) {
      emailInput.readOnly = false;
      emailInput.removeAttribute('readonly');
      emailInput.autocomplete = 'email';
      emailInput.placeholder = 'it26xxxxxx@my.sliit.lk';
      if (!emailFeedback) {
        emailFeedback = document.createElement('small');
        emailFeedback.id = 'signupEmailFeedback';
        emailFeedback.className = 'ff-field-feedback';
        emailFeedback.setAttribute('aria-live', 'polite');
        emailInput.closest('label')?.appendChild(emailFeedback);
      }
      const current = normalizeEmail(emailInput.value);
      if (expected && (!current || emailInput.dataset.autoValue === current)) {
        emailInput.value = expected;
        emailInput.dataset.autoValue = expected;
      }
    }
    if (idFeedback) {
      idFeedback.textContent = !id ? '' : validStudentId(id) ? `Expected SLIIT email: ${expected}` : 'Use your Student ID in the form IT26xxxxxxxx.';
      idFeedback.classList.toggle('is-valid', validStudentId(id));
    }
    if (emailFeedback) {
      const current = normalizeEmail(emailInput?.value);
      emailFeedback.textContent = !current ? 'Enter your SLIIT email address.' : !expected ? 'Enter a valid Student ID first.' : current === expected ? 'Student ID and SLIIT email match.' : `Email must be ${expected}`;
      emailFeedback.dataset.state = current && expected && current === expected ? 'valid' : 'error';
    }
  }

  async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { error: response.ok ? 'Unexpected server response.' : 'The signup service returned an invalid response.' }; }
  }

  async function sendVerification(user) {
    const options = { url: `${location.origin}${location.pathname}?verified=1`, handleCodeInApp: false };
    try { await withTimeout(user.sendEmailVerification(options), LIMITS.api, 'Verification email request'); }
    catch (error) {
      if (['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'].includes(error?.code)) {
        await withTimeout(user.sendEmailVerification(), LIMITS.api, 'Verification email request'); return;
      }
      throw error;
    }
  }

  async function sendReset(email) {
    try { await withTimeout(auth.sendPasswordResetEmail(email, { url: `${location.origin}${location.pathname}` }), LIMITS.api, 'Password reset request'); }
    catch (error) {
      if (['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'].includes(error?.code)) {
        await withTimeout(auth.sendPasswordResetEmail(email), LIMITS.api, 'Password reset request'); return;
      }
      throw error;
    }
  }

  function stopVerificationPolling() { clearInterval(verificationTimer); verificationTimer = null; }
  async function checkVerification({ userInitiated = false } = {}) {
    if (verificationCheckInFlight || !$('#verifyForm')?.classList.contains('active') || document.visibilityState === 'hidden') return false;
    const user = auth?.currentUser || pendingVerificationUser;
    if (!user) { setAuthView('login'); return false; }
    verificationCheckInFlight = true;
    try {
      await withTimeout(user.reload(), LIMITS.profile, 'Verification status refresh');
      const fresh = auth.currentUser || user;
      if (!fresh.emailVerified) {
        if (userInitiated) setAlert('Email is not verified yet. Open the verification link in your SLIIT mailbox, then try again.');
        return false;
      }
      setAlert('Email verified. Finishing your secure sign-in…', 'success');
      resolving = null;
      await resolveSignedInUser(fresh, 'verification');
      return true;
    } catch (error) {
      if (userInitiated) setAlert(humanError(error));
      return false;
    } finally { verificationCheckInFlight = false; }
  }
  function startVerificationPolling() {
    stopVerificationPolling();
    verificationTimer = setInterval(() => { if (!activeOperation && navigator.onLine) void checkVerification(); }, 5000);
  }

  function beginResendCooldown(seconds = 60) {
    resendUntil = Date.now() + seconds * 1000;
    clearInterval(resendTicker);
    const button = $('#verifyResendBtn');
    const original = button?.dataset.originalLabel || button?.textContent || 'Resend verification email';
    if (button) button.dataset.originalLabel = original;
    const tick = () => {
      const left = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
      if (!button) return;
      if (left > 0) { button.disabled = true; button.textContent = `Resend available in ${left}s`; }
      else { clearInterval(resendTicker); resendTicker = null; button.disabled = false; button.textContent = original; }
    };
    tick();
    resendTicker = setInterval(tick, 1000);
  }

  function bindForms() {
    const loginForm = $('#loginForm');
    loginForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (activeOperation) return;
      const identity = String($('#loginIdentity')?.value || '').trim();
      const password = String($('#loginPassword')?.value || '');
      if (loginRole === 'student' && !validStudentId(identity)) return setAlert('Enter a valid Student ID.');
      if (loginRole === 'admin' && !normalizeEmail(identity)) return setAlert('Enter your administrator email.');
      if (!password) return setAlert('Enter your password.');
      if (!navigator.onLine) return setAlert('You are offline. Reconnect to the internet and try again.');
      void runOperation('login', loginForm, 'Signing in securely…', async () => {
        setAlert('');
        const remember = $('#rememberSession')?.checked !== false;
        if (auth.setPersistence) await withTimeout(auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION), 8000, 'Session setup');
        const email = loginRole === 'admin' ? normalizeEmail(identity) : studentEmail(identity);
        const credential = await withTimeout(auth.signInWithEmailAndPassword(email, password), LIMITS.auth, 'Secure sign-in');
        const result = await resolveSignedInUser(credential.user, 'login');
        if (result === 'verify') return result;
        if (result !== 'app') throw new Error('Secure sign-in could not be completed.');
        return result;
      });
    });

    $('#signupStudentId')?.addEventListener('input', updateSignupEmailState);
    $('#derivedEmail')?.addEventListener('input', updateSignupEmailState);
    updateSignupEmailState();

    const signupForm = $('#signupForm');
    signupForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (activeOperation) return;
      const id = normalizeStudentId($('#signupStudentId')?.value);
      const expected = validStudentId(id) ? studentEmail(id) : '';
      const sliitEmail = normalizeEmail($('#derivedEmail')?.value);
      const password = String($('#signupPassword')?.value || '');
      const confirm = String($('#signupPassword2')?.value || '');
      if (!validStudentId(id)) return setAlert('Enter a valid Student ID such as IT26xxxxxxxx.');
      if (!sliitEmail) return setAlert('Enter your SLIIT email address.');
      if (sliitEmail !== expected) return setAlert(`Your SLIIT email must match your Student ID: ${expected}`);
      if (password.length < 8) return setAlert('Password must contain at least 8 characters.');
      if (password !== confirm) return setAlert('Passwords do not match.');
      if (!navigator.onLine) return setAlert('You are offline. Reconnect to the internet and try again.');
      void runOperation('signup', signupForm, 'Creating your secure account…', async () => {
        setAlert('');
        const response = await withTimeout(fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({ studentId: id, sliitEmail, password })
        }), LIMITS.api, 'Account creation');
        const result = await parseJsonResponse(response);
        if (!response.ok && response.status !== 409) throw new Error(result.error || 'Signup is temporarily unavailable.');
        const credential = await withTimeout(auth.signInWithEmailAndPassword(sliitEmail, password), LIMITS.auth, 'Account sign-in');
        if (credential.user.emailVerified) { await resolveSignedInUser(credential.user, 'existing-account'); return 'app'; }
        await sendVerification(credential.user);
        verificationView(credential.user, response.status === 409 ? 'This account already exists but is not verified. A fresh verification email was requested.' : `Verification email sent to ${sliitEmail}. Check Inbox and Junk/Spam.`);
        return 'verify';
      });
    });

    $('#verifyCheckBtn')?.addEventListener('click', event => {
      event.preventDefault();
      if (activeOperation) return;
      const form = $('#verifyForm');
      void runOperation('verify', form, 'Checking verification…', async () => {
        const ok = await checkVerification({ userInitiated: true });
        if (!ok && $('#verifyForm')?.classList.contains('active')) throw new Error('Email is not verified yet. Open the verification link, then try again.');
        return ok;
      });
    });

    $('#verifyResendBtn')?.addEventListener('click', event => {
      event.preventDefault();
      if (activeOperation || Date.now() < resendUntil) return;
      const form = $('#verifyForm');
      void runOperation('resend', form, 'Requesting a new verification email…', async () => {
        const user = auth.currentUser || pendingVerificationUser;
        if (!user) throw new Error('Sign in again before requesting another verification email.');
        await sendVerification(user);
        setAlert(`A new verification email was requested for ${user.email}. Check Inbox and Junk/Spam.`, 'success');
        beginResendCooldown(60);
        return true;
      });
    });

    const resetForm = $('#resetForm');
    resetForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (activeOperation) return;
      const id = normalizeStudentId($('#resetStudentId')?.value);
      if (!validStudentId(id)) return setAlert('Enter a valid Student ID.');
      if (!navigator.onLine) return setAlert('You are offline. Reconnect to the internet and try again.');
      void runOperation('reset', resetForm, 'Sending reset email…', async () => {
        await sendReset(studentEmail(id));
        setAlert(`Password reset request accepted for ${studentEmail(id)}. Check Inbox and Junk/Spam.`, 'success');
        return true;
      });
    });
  }

  async function adminRows() {
    const query = await withTimeout(db.collection('profiles').where('role', '==', 'student').limit(500).get(), LIMITS.profile, 'Student list');
    return query.docs.map(doc => ({ uid: doc.id, ...doc.data() })).sort((a, b) => (a.studentId || '').localeCompare(b.studentId || ''));
  }
  let adminCache = [];
  function renderAdminRows() {
    const body = $('#adminUsersBody');
    if (!body) return;
    const term = ($('#adminSearch')?.value || '').toLowerCase();
    const rows = adminCache.filter(item => !term || `${item.studentId} ${item.sliitEmail}`.toLowerCase().includes(term));
    body.innerHTML = rows.map(item => `<tr><td><b>${item.studentId || '—'}</b></td><td>${item.sliitEmail || '—'}</td><td><span class="pill ${item.emailVerified ? 'status-active' : 'status-disabled'}">${item.emailVerified ? 'Verified' : 'Pending'}</span></td><td>${fmtDate(item.lastLoginAt)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="ff-table-empty"><b>No matching students</b><span>Try a different Student ID or email search.</span></div></td></tr>';
  }
  window.refreshAdminDashboard = async () => {
    if (currentProfile?.role !== 'admin') return;
    const body = $('#adminUsersBody'), stats = $('#adminStats');
    if (!body || !stats) return;
    stats.innerHTML = Array.from({ length: 4 }, () => '<div class="card stat ff-skeleton-card" aria-hidden="true"><i></i><i></i><i></i></div>').join('');
    body.innerHTML = Array.from({ length: 4 }, () => '<tr class="ff-skeleton-row" aria-hidden="true"><td colspan="4"><i></i></td></tr>').join('');
    try {
      adminCache = await adminRows(); renderAdminRows();
      const disabled = adminCache.filter(item => item.disabled).length;
      stats.innerHTML = `<div class="card stat"><span class="muted small">Registered students</span><strong>${adminCache.length}</strong><span class="muted small">Firebase profiles</span></div><div class="card stat"><span class="muted small">Active</span><strong>${adminCache.length - disabled}</strong><span class="muted small">Can sign in</span></div><div class="card stat"><span class="muted small">Disabled</span><strong>${disabled}</strong><span class="muted small">Blocked in app</span></div><div class="card stat"><span class="muted small">Verification</span><strong>Email</strong><span class="muted small">SLIIT mailbox only</span></div>`;
    } catch (error) {
      body.innerHTML = `<tr><td colspan="4"><div class="ff-table-empty"><b>Student records could not load</b><span>${humanError(error)}</span><button class="btn" type="button" onclick="refreshAdminDashboard()">Try again</button></div></td></tr>`;
      window.toast?.('Could not refresh student records');
    }
  };
  $('#adminSearch')?.addEventListener('input', renderAdminRows);
  if (typeof window.go === 'function' && !window.go.__finalforgeAuthV2) {
    const originalGo = window.go;
    const wrappedGo = function finalforgeGo(id) {
      const result = originalGo.apply(this, arguments);
      if (id === 'admin') void window.refreshAdminDashboard();
      return result;
    };
    wrappedGo.__finalforgeAuthV2 = true;
    window.go = wrappedGo;
  }

  window.finalforgeSignOut = async () => {
    cancelOperation(); stopVerificationPolling(); clearTimeout(syncTimer); syncTimer = null;
    try { await withTimeout(pushCloud(), 4000, 'Final cloud sync'); } catch {}
    try { window.finalforgeAccountStorage?.unbind?.(); } catch {}
    localStorage.removeItem('finalforge_pending_student');
    try { await withTimeout(auth.signOut(), 8000, 'Sign out'); } catch {}
    location.reload();
  };

  function handleConnectivity() {
    if (!document.body.classList.contains('auth-pending')) return;
    if (!navigator.onLine) {
      runtimeState('offline', 'You are offline. Reconnect to continue.', { retry: false });
      setAlert('You are offline. Reconnect to the internet to sign in.');
      return;
    }
    if ($('#authAlert')?.textContent.includes('offline')) setAlert('');
    runtimeState($('#verifyForm')?.classList.contains('active') ? 'verify' : 'idle', $('#verifyForm')?.classList.contains('active') ? 'Waiting for SLIIT email verification.' : 'Secure sign-in ready.');
    if (auth?.currentUser) void resolveSignedInUser(auth.currentUser, 'online');
  }
  addEventListener('online', handleConnectivity);
  addEventListener('offline', handleConnectivity);
  addEventListener('focus', () => { if ($('#verifyForm')?.classList.contains('active')) setTimeout(() => { void checkVerification(); }, 250); });
  addEventListener('pageshow', () => { if ($('#verifyForm')?.classList.contains('active')) setTimeout(() => { void checkVerification(); }, 250); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#verifyForm')?.classList.contains('active')) setTimeout(() => { void checkVerification(); }, 250); });

  async function boot() {
    showGate();
    runtimeState('initializing', 'Preparing secure sign-in…');
    bindForms();
    const params = new URLSearchParams(location.search);
    const returnedFromVerification = params.get('verified') === '1';
    if (returnedFromVerification) {
      try {
        params.delete('verified');
        const query = params.toString();
        history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
      } catch {}
    }
    if (!cfg.enabled) {
      const note = $('#authConfigNote');
      if (note) {
        note.hidden = false;
        note.innerHTML = `<b>Firebase setup required.</b><br>Real SLIIT email verification and cloud accounts are disabled until <code>assets/firebase-config.js</code> is configured.${localPreviewAllowed ? '<br><button class="btn" id="previewBtn" type="button" style="margin-top:10px">Open local preview</button>' : ''}`;
      }
      $('#previewBtn')?.addEventListener('click', () => showApp({ role: 'student', studentId: 'PREVIEW' }, null, true));
      runtimeState('error', 'Firebase is not configured.', { retry: false });
      finishRestore();
      return;
    }
    if (!window.firebase) throw new Error('Firebase SDK did not load. Refresh the page and try again.');
    if (!firebase.apps?.length) firebase.initializeApp(cfg.config);
    auth = firebase.auth(); db = firebase.firestore();
    if (authUnsubscribe) authUnsubscribe();
    authUnsubscribe = auth.onAuthStateChanged(user => {
      bootSettled = true;
      if (!user) {
        resolving = null; pendingVerificationUser = null; showGate();
        setAuthView('login', { keepAlert: Boolean($('#authAlert')?.textContent.trim()) });
        if (navigator.onLine) runtimeState('idle', 'Secure sign-in ready.');
        return;
      }
      void resolveSignedInUser(user, 'restore');
    }, error => {
      setAlert(humanError(error)); runtimeState('error', humanError(error), { retry: true }); showGate();
    });
    setTimeout(() => {
      if (bootSettled) return;
      showGate();
      runtimeState(navigator.onLine ? 'error' : 'offline', navigator.onLine ? 'Secure sign-in is taking longer than expected. You can retry safely.' : 'You are offline. Reconnect to continue.', { retry: navigator.onLine });
      setAlert(navigator.onLine ? 'Secure sign-in is taking longer than expected. Retry without reloading your account data.' : 'You are offline. Reconnect to the internet to continue.');
    }, LIMITS.boot);
    if (returnedFromVerification && auth.currentUser) setTimeout(() => { void checkVerification(); }, 400);
  }

  boot().catch(error => {
    showGate(); setAlert(humanError(error)); runtimeState('error', humanError(error), { retry: true }); finishRestore();
  });
})();