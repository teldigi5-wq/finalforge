/* FinalForge Auth Runtime v3 — single-owner Firebase auth with server-certified student activation. */
(() => {
  'use strict';

  if (window.FINALFORGE_AUTH_RUNTIME_V2) return;
  window.FINALFORGE_AUTH_RUNTIME_V2 = Object.freeze({ version: '3.0.0', registrationWindowMinutes: 20 });

  const cfg = window.FINALFORGE_FIREBASE || { enabled: false };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const gate = $('#authGate');
  const card = gate?.querySelector('.auth-card') || null;
  const localPreviewAllowed = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const CLOUD_PROGRESS_KEY = 'finalforge_progress';
  const PENDING_STUDENT_KEY = 'finalforge_pending_student';
  const PENDING_EXPIRY_KEY = 'finalforge_signup_expires_at';
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const REGISTRATION_WINDOW_MS = 20 * 60 * 1000;
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
  let verificationCountdownTimer = null;
  let verificationCheckInFlight = false;
  let resendUntil = 0;
  let resendTicker = null;
  let bootSettled = false;

  function ensureV2Styles() {
    if (document.querySelector('link[data-finalforge-auth-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/auth-system-v2.css?v=3';
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

  function codedError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function humanError(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || error || 'Authentication failed.');
    if (code === 'finalforge/timeout') return message;
    if (code === 'finalforge/registration-expired') return 'Your 20-minute registration window expired. Restart verification to continue.';
    if (code.includes('user-not-found')) return 'Student ID not found. Check the ID or create an account first.';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Student ID or password is incorrect.';
    if (code.includes('user-disabled')) return 'This account is disabled. Contact the FinalForge administrator.';
    if (code.includes('invalid-email')) return 'Enter a valid administrator email address.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes, then try again.';
    if (code.includes('email-already-in-use')) return 'This Student ID already has an account. Log in or reset the password.';
    if (code.includes('weak-password')) return 'Choose a stronger password with at least 8 characters.';
    if (code.includes('network-request-failed')) return 'Network error. Check your connection and try again.';
    if (code.includes('unauthorized-domain') || code.includes('unauthorized-continue-uri')) return 'This FinalForge address is not authorized for Firebase yet.';
    if (code.includes('admin-restricted-operation')) return 'Direct Firebase signup is disabled. Use FinalForge Create account instead.';
    if (code === 'permission-denied' || code.includes('permission-denied')) return 'This Student ID is not approved, already claimed, or does not match the verified SLIIT account.';
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

  async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); }
    catch { return { error: response.ok ? 'Unexpected server response.' : 'FinalForge returned an invalid response.' }; }
  }

  async function postAuthenticated(path, user, label) {
    const token = await withTimeout(user.getIdToken(true), LIMITS.profile, `${label} token refresh`);
    const response = await withTimeout(fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-FinalForge-Token': token
      },
      credentials: 'same-origin',
      cache: 'no-store',
      body: '{}'
    }), LIMITS.api, label);
    return { response, result: await parseJsonResponse(response) };
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
      signup: ['Approved students only', 'Create your account', 'Student ID + password. We derive your SLIIT mailbox automatically.'],
      verify: ['20-minute activation', 'Verify your SLIIT email', 'Open the verification link, then return here to activate your account.'],
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
      startVerificationCountdown();
      runtimeState('verify', 'Waiting for SLIIT email verification.');
    } else {
      stopVerificationPolling();
      stopVerificationCountdown();
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

  function clearPendingRegistrationState() {
    localStorage.removeItem(PENDING_STUDENT_KEY);
    localStorage.removeItem(PENDING_EXPIRY_KEY);
  }

  function showApp(profile, user, preview = false) {
    cancelOperation();
    stopVerificationPolling();
    stopVerificationCountdown();
    clearPendingRegistrationState();
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

  async function activateVerifiedStudent(user) {
    await withTimeout(user.reload(), LIMITS.profile, 'Account verification');
    const fresh = auth.currentUser || user;
    if (!fresh.emailVerified) throw new Error('Verify your SLIIT email before continuing.');
    const token = await withTimeout(fresh.getIdTokenResult(true), LIMITS.profile, 'Verified email claim refresh');
    if (token.claims.email_verified !== true) throw new Error('Verify your SLIIT email before continuing.');

    const { response, result } = await postAuthenticated('/api/activate-account', fresh, 'Account activation');
    if (response.status === 410 || result?.code === 'REGISTRATION_EXPIRED') {
      throw codedError(result?.error || 'Registration expired.', 'finalforge/registration-expired');
    }
    if (!response.ok) throw new Error(result?.error || 'Account activation could not be completed.');

    const profileSnap = await withTimeout(db.collection('profiles').doc(fresh.uid).get(), LIMITS.profile, 'Student profile restore');
    if (!profileSnap.exists) throw new Error('Student profile could not be restored after activation.');
    const data = profileSnap.data();
    const email = normalizeEmail(fresh.email);
    const id = normalizeStudentId(email.split('@')[0]);
    if (data.role !== 'student' || data.studentId !== id || normalizeEmail(data.sliitEmail) !== email || data.emailVerified !== true || data.disabled === true) {
      const error = new Error('Student account profile is invalid or disabled.');
      error.code = 'permission-denied';
      throw error;
    }
    return data;
  }

  function storedExpiry(user) {
    const stored = Number(localStorage.getItem(PENDING_EXPIRY_KEY) || 0);
    if (stored > 0) return stored;
    const created = new Date(user?.metadata?.creationTime || 0).getTime();
    return Number.isFinite(created) && created > 0 ? created + REGISTRATION_WINDOW_MS : 0;
  }

  function setPendingExpiry(value) {
    const expiry = Number(value || 0);
    if (expiry > 0) localStorage.setItem(PENDING_EXPIRY_KEY, String(expiry));
    else localStorage.removeItem(PENDING_EXPIRY_KEY);
  }

  function stopVerificationCountdown() {
    clearInterval(verificationCountdownTimer);
    verificationCountdownTimer = null;
  }

  function renderVerificationCountdown() {
    const user = auth?.currentUser || pendingVerificationUser;
    const box = $('#verifyCountdown');
    const restart = $('#verifyRestartBtn');
    const check = $('#verifyCheckBtn');
    const resend = $('#verifyResendBtn');
    if (!box || !user) return;
    const expiry = storedExpiry(user);
    if (!expiry) {
      box.textContent = '20:00 activation window';
      box.dataset.state = 'ready';
      if (restart) restart.hidden = false;
      return;
    }
    const left = Math.max(0, expiry - Date.now());
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    box.textContent = left > 0 ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} remaining` : 'Verification window expired';
    box.dataset.state = left > 0 ? 'active' : 'expired';
    if (left <= 0) {
      if (check) check.disabled = true;
      if (resend) resend.disabled = true;
      if (restart) restart.hidden = false;
    } else {
      if (check && !activeOperation) check.disabled = false;
      if (resend && !activeOperation && Date.now() >= resendUntil) resend.disabled = false;
      if (restart) restart.hidden = true;
    }
  }

  function startVerificationCountdown() {
    stopVerificationCountdown();
    renderVerificationCountdown();
    verificationCountdownTimer = setInterval(renderVerificationCountdown, 1000);
  }

  function verificationView(user, message = '', expiresAt = 0) {
    pendingVerificationUser = user;
    const email = $('#verifyEmail');
    if (email) email.textContent = user?.email || '';
    if (user?.email) {
      const id = normalizeStudentId(String(user.email).split('@')[0]);
      if (validStudentId(id)) localStorage.setItem(PENDING_STUDENT_KEY, id);
    }
    if (expiresAt) setPendingExpiry(expiresAt);
    showGate();
    setAuthView('verify', { keepAlert: Boolean(message) });
    if (message) setAlert(message, 'success');
    renderVerificationCountdown();
  }

  async function restartRegistrationWindow(user) {
    const { response, result } = await postAuthenticated('/api/restart-registration', user, 'Registration restart');
    if (response.status === 409 && result?.code === 'ALREADY_ACTIVE') return { active: true };
    if (!response.ok) throw new Error(result?.error || 'Registration could not be restarted.');
    setPendingExpiry(result.expiresAt);
    return { active: false, expiresAt: Number(result.expiresAt || 0), email: result.email || user.email };
  }

  async function resolveSignedInUser(user, source = 'auth-state') {
    if (!user) return 'login';
    if (resolving?.uid === user.uid) return resolving.promise;
    const promise = (async () => {
      showGate();
      runtimeState('authenticating', source === 'restore' ? 'Restoring your secure session…' : 'Checking your account…');
      if (!user.emailVerified) {
        verificationView(user);
        return 'verify';
      }
      const token = await withTimeout(user.getIdTokenResult(true), LIMITS.profile, 'Account authorization');
      if (token.claims.admin) {
        const adminProfile = await loadAdminProfile(user);
        showApp(adminProfile, user);
        return 'app';
      }
      const profile = await activateVerifiedStudent(user);
      showApp(profile, user);
      void pullOrPush();
      return 'app';
    })().catch(async error => {
      const text = humanError(error);
      if (error?.code === 'finalforge/registration-expired') {
        pendingVerificationUser = auth?.currentUser || user;
        showGate();
        setAuthView('verify', { keepAlert: true });
        setAlert(text);
        setPendingExpiry(Date.now() - 1);
        renderVerificationCountdown();
        return 'expired';
      }
      setAlert(text);
      runtimeState(navigator.onLine ? 'error' : 'offline', text, { retry: true });
      try { await withTimeout(auth.signOut(), 5000, 'Sign out'); } catch {}
      showGate();
      setAuthView('login', { keepAlert: true });
      return 'error';
    }).finally(() => { if (resolving?.promise === promise) resolving = null; });
    resolving = { uid: user.uid, promise };
    return promise;
  }

  function updateSignupIdentityState() {
    const id = normalizeStudentId($('#signupStudentId')?.value);
    const email = validStudentId(id) ? studentEmail(id) : '';
    const idFeedback = $('#signupStudentIdFeedback');
    const emailText = $('#derivedEmailText');
    if (emailText) emailText.textContent = email || 'Your SLIIT email will appear here';
    if (idFeedback) {
      idFeedback.textContent = !id ? '' : validStudentId(id) ? 'Student ID format looks correct.' : 'Use your Student ID in the form IT26xxxxxxxx.';
      idFeedback.classList.toggle('is-valid', validStudentId(id));
      idFeedback.dataset.state = validStudentId(id) ? 'valid' : 'error';
    }
  }

  function updatePasswordMatch() {
    const password = String($('#signupPassword')?.value || '');
    const confirm = String($('#signupPassword2')?.value || '');
    const feedback = $('#signupPasswordMatch');
    if (!feedback) return;
    feedback.textContent = !confirm ? '' : password === confirm ? 'Passwords match.' : 'Passwords do not match.';
    feedback.dataset.state = confirm && password === confirm ? 'valid' : 'error';
  }

  async function sendVerification(user) {
    const options = { url: `${location.origin}${location.pathname}?verified=1`, handleCodeInApp: false };
    try { await withTimeout(user.sendEmailVerification(options), LIMITS.api, 'Verification email request'); }
    catch (error) {
      if (['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'].includes(error?.code)) {
        await withTimeout(user.sendEmailVerification(), LIMITS.api, 'Verification email request');
        return;
      }
      throw error;
    }
  }

  async function sendReset(email) {
    try { await withTimeout(auth.sendPasswordResetEmail(email, { url: `${location.origin}${location.pathname}` }), LIMITS.api, 'Password reset request'); }
    catch (error) {
      if (['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'].includes(error?.code)) {
        await withTimeout(auth.sendPasswordResetEmail(email), LIMITS.api, 'Password reset request');
        return;
      }
      throw error;
    }
  }

  function stopVerificationPolling() {
    clearInterval(verificationTimer);
    verificationTimer = null;
  }

  async function checkVerification({ userInitiated = false } = {}) {
    if (verificationCheckInFlight || !$('#verifyForm')?.classList.contains('active') || document.visibilityState === 'hidden') return false;
    const user = auth?.currentUser || pendingVerificationUser;
    if (!user) { setAuthView('login'); return false; }
    const expiry = storedExpiry(user);
    if (expiry && expiry <= Date.now() && !user.emailVerified) {
      renderVerificationCountdown();
      if (userInitiated) setAlert('The 20-minute verification window expired. Restart verification to receive a new window.');
      return false;
    }
    verificationCheckInFlight = true;
    try {
      await withTimeout(user.reload(), LIMITS.profile, 'Verification status refresh');
      const fresh = auth.currentUser || user;
      if (!fresh.emailVerified) {
        if (userInitiated) setAlert('Email is not verified yet. Open the verification link in your SLIIT mailbox, then try again.');
        return false;
      }
      setAlert('Email verified. Activating your FinalForge account…', 'success');
      resolving = null;
      const result = await resolveSignedInUser(fresh, 'verification');
      return result === 'app';
    } catch (error) {
      if (userInitiated) setAlert(humanError(error));
      return false;
    } finally {
      verificationCheckInFlight = false;
    }
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
      if (left > 0) {
        button.disabled = true;
        button.textContent = `Resend available in ${left}s`;
      } else {
        clearInterval(resendTicker);
        resendTicker = null;
        button.disabled = false;
        button.textContent = original;
        renderVerificationCountdown();
      }
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
        if (auth.setPersistence) {
          await withTimeout(auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION), 8000, 'Session setup');
        }
        const email = loginRole === 'admin' ? normalizeEmail(identity) : studentEmail(identity);
        const credential = await withTimeout(auth.signInWithEmailAndPassword(email, password), LIMITS.auth, 'Secure sign-in');
        const result = await resolveSignedInUser(credential.user, 'login');
        if (['verify', 'expired', 'app'].includes(result)) return result;
        throw new Error('Secure sign-in could not be completed.');
      });
    });

    $('#signupStudentId')?.addEventListener('input', updateSignupIdentityState);
    $('#signupPassword')?.addEventListener('input', updatePasswordMatch);
    $('#signupPassword2')?.addEventListener('input', updatePasswordMatch);
    updateSignupIdentityState();

    const signupForm = $('#signupForm');
    signupForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (activeOperation) return;
      const id = normalizeStudentId($('#signupStudentId')?.value);
      const email = validStudentId(id) ? studentEmail(id) : '';
      const password = String($('#signupPassword')?.value || '');
      const confirm = String($('#signupPassword2')?.value || '');
      if (!validStudentId(id)) return setAlert('Enter a valid Student ID such as IT26xxxxxxxx.');
      if (password.length < 8 || password.length > 128) return setAlert('Password must contain 8 to 128 characters.');
      if (password !== confirm) return setAlert('Passwords do not match.');
      if (!navigator.onLine) return setAlert('You are offline. Reconnect to the internet and try again.');

      void runOperation('signup', signupForm, 'Preparing your account…', async () => {
        setAlert('');
        const response = await withTimeout(fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({ studentId: id, password })
        }), LIMITS.api, 'Account creation');
        const result = await parseJsonResponse(response);
        if (!response.ok && response.status !== 409) throw new Error(result.error || 'Signup is temporarily unavailable.');

        const credential = await withTimeout(auth.signInWithEmailAndPassword(email, password), LIMITS.auth, 'Account sign-in');
        let expiry = Number(result.expiresAt || 0);

        if (response.status === 409 && ['expired', 'legacy'].includes(result.registration)) {
          const restarted = await restartRegistrationWindow(credential.user);
          if (restarted.active) return resolveSignedInUser(credential.user, 'existing-account');
          expiry = restarted.expiresAt;
        }

        if (credential.user.emailVerified) {
          return resolveSignedInUser(credential.user, 'existing-account');
        }

        if (!expiry && result.registration !== 'active') {
          const restarted = await restartRegistrationWindow(credential.user);
          if (restarted.active) return resolveSignedInUser(credential.user, 'existing-account');
          expiry = restarted.expiresAt;
        }

        await sendVerification(credential.user);
        verificationView(
          credential.user,
          `Verification email sent to ${email}. Activate your account within 20 minutes.`,
          expiry
        );
        beginResendCooldown(60);
        return 'verify';
      });
    });

    $('#verifyCheckBtn')?.addEventListener('click', event => {
      event.preventDefault();
      if (activeOperation) return;
      const form = $('#verifyForm');
      void runOperation('verify', form, 'Checking verification…', async () => {
        const ok = await checkVerification({ userInitiated: true });
        if (!ok && $('#verifyForm')?.classList.contains('active')) throw new Error('Email is not verified yet or the activation window has expired.');
        return ok;
      });
    });

    $('#verifyResendBtn')?.addEventListener('click', event => {
      event.preventDefault();
      if (activeOperation || Date.now() < resendUntil) return;
      const user = auth?.currentUser || pendingVerificationUser;
      if (!user) return setAlert('Sign in again before requesting another verification email.');
      const expiry = storedExpiry(user);
      if (expiry && expiry <= Date.now()) {
        renderVerificationCountdown();
        return setAlert('The verification window expired. Use Restart verification to begin a new 20-minute window.');
      }
      const form = $('#verifyForm');
      void runOperation('resend', form, 'Requesting a new verification email…', async () => {
        await sendVerification(user);
        setAlert(`A new verification email was requested for ${user.email}. The original 20-minute activation deadline does not change.`, 'success');
        beginResendCooldown(60);
        return true;
      });
    });

    $('#verifyRestartBtn')?.addEventListener('click', event => {
      event.preventDefault();
      if (activeOperation) return;
      const user = auth?.currentUser || pendingVerificationUser;
      if (!user) return setAuthView('signup');
      const form = $('#verifyForm');
      void runOperation('restart-registration', form, 'Restarting verification…', async () => {
        const restarted = await restartRegistrationWindow(user);
        if (restarted.active) return resolveSignedInUser(user, 'restart-active');
        await user.reload();
        const fresh = auth.currentUser || user;
        if (fresh.emailVerified) {
          resolving = null;
          return resolveSignedInUser(fresh, 'restart-verified');
        }
        await sendVerification(fresh);
        verificationView(fresh, `New verification window started for ${fresh.email}. You have 20 minutes.`, restarted.expiresAt);
        beginResendCooldown(60);
        return 'verify';
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
      adminCache = await adminRows();
      renderAdminRows();
      const disabled = adminCache.filter(item => item.disabled).length;
      stats.innerHTML = `<div class="card stat"><span class="muted small">Registered students</span><strong>${adminCache.length}</strong><span class="muted small">Activated profiles</span></div><div class="card stat"><span class="muted small">Active</span><strong>${adminCache.length - disabled}</strong><span class="muted small">Can sign in</span></div><div class="card stat"><span class="muted small">Disabled</span><strong>${disabled}</strong><span class="muted small">Blocked in app</span></div><div class="card stat"><span class="muted small">Signup window</span><strong>20 min</strong><span class="muted small">SLIIT verification</span></div>`;
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
    cancelOperation();
    stopVerificationPolling();
    stopVerificationCountdown();
    clearTimeout(syncTimer);
    syncTimer = null;
    try { await withTimeout(pushCloud(), 4000, 'Final cloud sync'); } catch {}
    try { window.finalforgeAccountStorage?.unbind?.(); } catch {}
    clearPendingRegistrationState();
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
    auth = firebase.auth();
    db = firebase.firestore();
    if (authUnsubscribe) authUnsubscribe();
    authUnsubscribe = auth.onAuthStateChanged(user => {
      bootSettled = true;
      if (!user) {
        resolving = null;
        pendingVerificationUser = null;
        showGate();
        setAuthView('login', { keepAlert: Boolean($('#authAlert')?.textContent.trim()) });
        if (navigator.onLine) runtimeState('idle', 'Secure sign-in ready.');
        return;
      }
      void resolveSignedInUser(user, 'restore');
    }, error => {
      setAlert(humanError(error));
      runtimeState('error', humanError(error), { retry: true });
      showGate();
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
    showGate();
    setAlert(humanError(error));
    runtimeState('error', humanError(error), { retry: true });
    finishRestore();
  });
})();
