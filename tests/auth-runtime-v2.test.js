import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth = fs.readFileSync(new URL('../assets/auth.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../assets/core-loader.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/auth-system-v2.css', import.meta.url), 'utf8');
const accountStorage = fs.readFileSync(new URL('../assets/account-storage-v1.js', import.meta.url), 'utf8');

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('auth runtime parses and keeps one canonical Firebase owner', () => {
  assert.doesNotThrow(() => new Function(auth));
  assert.match(auth, /FINALFORGE_AUTH_RUNTIME_V2/);
  assert.match(auth, /version: '3\.0\.0'/);
  assert.equal(occurrences(auth, 'onAuthStateChanged('), 1);
});

test('account storage never intercepts Firebase authentication', () => {
  assert.doesNotThrow(() => new Function(accountStorage));
  assert.match(accountStorage, /authBinding:'explicit'/);
  assert.doesNotMatch(accountStorage, /onAuthStateChanged\s*\(/);
  assert.doesNotMatch(accountStorage, /signInWithEmailAndPassword\s*=/);
  assert.match(accountStorage, /queueRefreshViews\(/);
  assert.match(accountStorage, /requestAnimationFrame/);
});

test('auth operations are timeout-bounded and always recover form controls', () => {
  assert.match(auth, /function withTimeout\(/);
  assert.match(auth, /function runOperation\(/);
  assert.match(auth, /finally \{/);
  assert.match(auth, /setBusy\(form, false\)/);
  assert.match(auth, /Secure sign-in is taking longer than expected/);
});

test('student activation is server certified instead of browser-created claims', () => {
  assert.match(auth, /fetch\(path/);
  assert.match(auth, /'X-FinalForge-Token': token/);
  assert.match(auth, /postAuthenticated\('\/api\/activate-account'/);
  assert.match(auth, /getIdTokenResult\(true\)/);
  assert.match(auth, /token\.claims\.email_verified !== true/);
  assert.doesNotMatch(auth, /transaction\.set\(claimRef/);
  assert.doesNotMatch(auth, /collection\('student_claims'\)\.doc/);
});

test('signup derives SLIIT email and sends only Student ID plus password', () => {
  assert.match(auth, /const email = validStudentId\(id\) \? studentEmail\(id\) : ''/);
  assert.match(auth, /body: JSON\.stringify\(\{ studentId: id, password \}\)/);
  assert.doesNotMatch(auth, /body: JSON\.stringify\(\{ studentId: id, sliitEmail/);
  assert.match(auth, /20-minute/);
  assert.match(auth, /verifyRestartBtn/);
});

test('loader has one auth owner and ships simplified auth flow UI', () => {
  assert.doesNotThrow(() => new Function(loader));
  assert.match(loader, /loadStyle\('assets\/auth-system-v2\.css'\)/);
  assert.match(loader, /loadStyle\('assets\/mobile-premium-v7\.css'\)/);
  assert.match(loader, /loadScript\('assets\/auth-flow-dom-v1\.js'\)/);
  assert.match(loader, /loadScript\('assets\/auth\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/session-restore-v1\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/signup-fix-v2\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/verification-handoff-v1\.js'\)/);
});

test('protected signup remains same-origin and no-store from browser runtime', () => {
  assert.match(auth, /fetch\('\/api\/signup'/);
  assert.match(auth, /credentials: 'same-origin'/);
  assert.match(auth, /cache: 'no-store'/);
});

test('auth UI includes responsive and reduced-motion hardening', () => {
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /overflow:auto/);
});
