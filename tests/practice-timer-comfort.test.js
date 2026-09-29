import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const timer=fs.readFileSync('assets/practice-timer-runtime-v1.js','utf8');
const comfort=fs.readFileSync('assets/premium-comfort-v2.css','utf8');
const loader=fs.readFileSync('assets/core-loader.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

test('practice timer is deadline-based and resynchronizes after throttling',()=>{
  assert.doesNotThrow(()=>new Function(timer));
  assert.match(timer,/Date\.now\(\)/);
  assert.match(timer,/endAt/);
  assert.match(timer,/setTimeout\(tick/);
  assert.match(timer,/visibilitychange/);
  assert.match(timer,/pageshow/);
  assert.match(timer,/focus/);
  assert.match(timer,/live countdown/);
  assert.match(timer,/finalforge-exam-time-expired/);
  assert.doesNotMatch(timer,/setInterval\(/);
});

test('premium comfort v2 improves exam ergonomics without perpetual animation',()=>{
  assert.match(comfort,/ff-v5-exam-rail/);
  assert.match(comfort,/exam-clock/);
  assert.match(comfort,/font-variant-numeric:tabular-nums/);
  assert.match(comfort,/ff-timer-warning/);
  assert.match(comfort,/ff-timer-urgent/);
  assert.match(comfort,/ff-v5-options/);
  assert.match(comfort,/pointer-events:none/);
  assert.match(comfort,/@media\(max-width:640px\)/);
  assert.match(comfort,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(comfort,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and current service worker keep timer comfort as critical runtime',()=>{
  assert.match(loader,/loadStyle\('assets\/premium-comfort-v2\.css'\)/);
  assert.match(loader,/loadScript\('assets\/practice-timer-runtime-v1\.js'\)/);
  assert.match(sw,/finalforge-v63-account-security/);
  assert.match(sw,/practice-timer-runtime-v1\.js/);
  assert.match(sw,/premium-comfort-v2\.css/);
  const critical=sw.slice(sw.indexOf('const CRITICAL_RUNTIME'),sw.indexOf("self.addEventListener('install'"));
  assert.match(critical,/practice-timer-runtime-v1\.js/);
  assert.match(critical,/premium-comfort-v2\.css/);
});