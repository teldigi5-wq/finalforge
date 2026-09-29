import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/account-security-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/account-security-v1.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('security center parses and stays event-driven',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_ACCOUNT_SECURITY_V1/);
  assert.doesNotMatch(runtime,/MutationObserver/);
  assert.match(runtime,/onAuthStateChanged/);
  assert.match(runtime,/getIdToken\(true\)/);
});

test('password recovery uses Firebase email flow without collecting passwords',()=>{
  assert.match(runtime,/sendPasswordResetEmail/);
  assert.match(runtime,/RECOVERY_COOLDOWN_MS=60000/);
  assert.doesNotMatch(runtime,/updatePassword\(/);
  assert.doesNotMatch(runtime,/localStorage\.setItem\([^\n]*(password|token)/i);
});

test('session persistence is explicit and browser-local',()=>{
  assert.match(runtime,/Auth\.Persistence\.LOCAL/);
  assert.match(runtime,/Auth\.Persistence\.SESSION/);
  assert.match(runtime,/PERSISTENCE_KEY='finalforge_security_persistence_v1'/);
});

test('security surface is responsive, light-theme aware and reduced-motion safe',()=>{
  assert.match(css,/ff-security-dialog/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/html\[data-theme="light"\]/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker ship account security as critical runtime',()=>{
  assert.match(loader,/account-security-v1\.css/);
  assert.match(loader,/account-security-v1\.js/);
  assert.match(sw,/account-security-v1\.css/);
  assert.match(sw,/account-security-v1\.js/);
  assert.match(sw,/finalforge-v63-account-security/);
});
