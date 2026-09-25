/* FinalForge UX hardening — presentation feedback only; validation and auth calls remain authoritative in auth.js. */
(() => {
  const $ = s => document.querySelector(s);
  const normalizeStudentId = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const validStudentId = value => /^IT\d{8}$/.test(normalizeStudentId(value));

  function setFeedback(input, output, message, state = '') {
    if (!input || !output) return;
    output.textContent = message;
    output.dataset.state = state;
    if (state === 'error') input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function watchStudentId(inputId, outputId, studentOnly = false) {
    const input = $('#' + inputId), output = $('#' + outputId);
    if (!input || !output) return;
    const check = force => {
      if (studentOnly && input.type === 'email') return setFeedback(input, output, '', '');
      const raw = input.value.trim();
      if (!raw) return setFeedback(input, output, '', '');
      const id = normalizeStudentId(raw);
      if (validStudentId(id)) return setFeedback(input, output, 'Student ID format looks correct.', 'valid');
      if (force || id.length >= 10) return setFeedback(input, output, 'Use IT followed by exactly 8 digits.', 'error');
      setFeedback(input, output, 'Student IDs use IT followed by 8 digits.', 'hint');
    };
    input.addEventListener('input', () => check(false));
    input.addEventListener('blur', () => check(true));
    input.addEventListener('change', () => check(true));
  }

  watchStudentId('loginIdentity', 'loginIdentityFeedback', true);
  watchStudentId('signupStudentId', 'signupStudentIdFeedback');
  watchStudentId('resetStudentId', 'resetStudentIdFeedback');

  const password = $('#signupPassword'), confirmation = $('#signupPassword2'), strength = $('#signupStrength'), match = $('#signupPasswordMatch');
  function updateStrength() {
    if (!password || !strength) return;
    const value = password.value;
    if (!value) {
      strength.dataset.level = '0';
      strength.querySelector('span').textContent = 'Use 8 or more characters';
      return;
    }
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    const level = value.length < 8 ? 1 : Math.min(4, Math.max(2, score));
    strength.dataset.level = String(level);
    strength.querySelector('span').textContent = ['Use 8 or more characters', 'Too short', 'Fair', 'Good', 'Strong'][level];
    updateMatch();
  }
  function updateMatch() {
    if (!confirmation || !match) return;
    if (!confirmation.value) return setFeedback(confirmation, match, '', '');
    const same = confirmation.value === (password?.value || '');
    setFeedback(confirmation, match, same ? 'Passwords match.' : 'Passwords do not match.', same ? 'valid' : 'error');
  }
  password?.addEventListener('input', updateStrength);
  confirmation?.addEventListener('input', updateMatch);

  function focusFirstEmpty(form) {
    if (!form?.classList.contains('active')) return;
    const target = [...form.querySelectorAll('input:not([type="hidden"]):not([readonly]):not([disabled])')].find(input => !input.value);
    if (target && !target.matches(':focus')) target.focus({preventScroll:true});
  }

  function installAuthHooks() {
    if (window.showAuthView && !window.showAuthView.ffUxWrapped) {
      const originalShowAuthView = window.showAuthView;
      const wrapped = name => {
        originalShowAuthView(name);
        requestAnimationFrame(() => focusFirstEmpty($('.auth-view.active')));
      };
      wrapped.ffUxWrapped = true;
      window.showAuthView = wrapped;
    }
    if (window.setLoginRole && !window.setLoginRole.ffUxWrapped) {
      const originalSetLoginRole = window.setLoginRole;
      const wrapped = role => {
        originalSetLoginRole(role);
        const input = $('#loginIdentity'), output = $('#loginIdentityFeedback');
        setFeedback(input, output, '', '');
        requestAnimationFrame(() => input?.focus({preventScroll:true}));
      };
      wrapped.ffUxWrapped = true;
      window.setLoginRole = wrapped;
    }
  }

  addEventListener('finalforge-ready', () => {
    installAuthHooks();
    const active = $('.auth-view.active');
    if (document.body.classList.contains('auth-pending') && !active?.querySelector(':focus')) focusFirstEmpty(active);
  }, {once:true});
})();
