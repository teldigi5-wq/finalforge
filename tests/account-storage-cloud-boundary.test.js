import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const auth=fs.readFileSync(new URL('../assets/auth.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');

test('account-isolation auth runtime parses successfully',()=>{
  assert.doesNotThrow(()=>new vm.Script(auth));
});

test('Firebase Firestore compat SDK uses the canonical CDN filename',()=>{
  assert.match(loader,/firebasejs\/10\.14\.1\/firebase-firestore-compat\.js/);
  assert.doesNotMatch(loader,/firebasejs\/10\.14\.1\/firestore-compat\.js/);
});

test('cloud sync is explicitly progress-only for the account-isolation release',()=>{
  assert.match(auth,/const CLOUD_PROGRESS_KEY='finalforge_progress'/);
  assert.match(auth,/function sanitizeRemoteSnapshot\(snap\)/);
  assert.match(auth,/String\(k\)===CLOUD_PROGRESS_KEY/);
  assert.doesNotMatch(auth,/function snapshotLocal\(/);
  assert.doesNotMatch(auth,/String\(k\)\.startsWith\('finalforge_'\)/);
});

test('progress sync replaces legacy broad snapshot maps instead of merging practice answers back in',()=>{
  assert.match(auth,/if\(previous\.exists\)tx\.update\(ref,payload\);else tx\.set\(ref,payload\)/);
  assert.match(auth,/const merged=mergeProgressSnapshot\(local,previous\.data\(\)\?\.snapshot\|\|\{\}\)/);
});
