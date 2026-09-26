import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../assets/signup-fix-v2.js', import.meta.url), 'utf8');

test('signup reliability patch keeps the create-account card scroll-safe', () => {
  assert.match(source, /auth-card\[data-mode="signup"\][\s\S]*overflow-y:auto!important/);
});

test('signup reliability patch recovers unverified existing accounts', () => {
  assert.match(source, /response\.status===409/);
  assert.match(source, /A new verification email has been sent/);
});

test('verification email falls back when continue URL is rejected', () => {
  assert.match(source, /auth\/unauthorized-continue-uri/);
  assert.match(source, /await user\.sendEmailVerification\(\)/);
});
