import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth = fs.readFileSync(new URL('../assets/auth.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../assets/core-loader.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/auth-system-v2.css', import.meta.url), 'utf8');

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('auth runtime parses and declares one canonical v2 owner', () => {
  assert.doesNotThrow(() => new Function(auth));
  assert.match(auth, /FINALFORGE_AUTH_RUNTIME_V2/);
  assert.equal(occurrences(auth, 'onAuthStateChanged('), 1);
});

test('auth operations are timeout-bounded and always recover form controls', () => {
  assert.match(auth, /function withTimeout\(/);
  assert.match(auth, /function runOperation\(/);
  assert.match(auth, /finally \{/);
  assert.match(auth, /setBusy\(form, false\)/);
  assert.match(auth, /Secure sign-in is taking longer than expected/);
});

test('student entitlement checks remain fail closed', () => {
  assert.match(auth, /getIdTokenResult\(true\)/);
  assert.match(auth, /token\.claims\.email_verified !== true/);
  assert.match(auth, /collection\('student_claims'\)/);
  assert.match(auth, /data\.role !== 'student'/);
  assert.match(auth, /data\.disabled === true/);
  assert.match(auth, /claimSnap\.data\(\)\?\.uid !== fresh\.uid/);
});

test('loader has one auth owner and no legacy auth interception layers', () => {
  assert.doesNotThrow(() => new Function(loader));
  assert.match(loader, /loadStyle\('assets\/auth-system-v2\.css'\)/);
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
