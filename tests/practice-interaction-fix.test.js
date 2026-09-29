import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/practice-interaction-fix-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-interaction-fix-v1.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('practice interaction runtime delegates the hub controls and can recover underlying controls',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_PRACTICE_INTERACTION_FIX_V1/);
  assert.match(runtime,/data-start-mode/);
  assert.match(runtime,/data-go-tool/);
  assert.match(runtime,/data-practice-module/);
  assert.match(runtime,/elementsFromPoint/);
  assert.match(runtime,/stopImmediatePropagation/);
  assert.match(runtime,/removeAttribute\('inert'\)/);
  assert.match(runtime,/startPracticeExam/);
  assert.match(runtime,/goPracticeQuestion/);
});

test('practice overlay CSS makes visual layers non-interactive and controls interactive',()=>{
  assert.match(css,/pointer-events:none!important/);
  assert.match(css,/pointer-events:auto!important/);
  assert.match(css,/ff-v5-paper-index/);
  assert.match(css,/cursor-glow/);
  assert.match(css,/#weaknessPanel:empty/);
  assert.match(css,/touch-action:manipulation/);
});

test('production loader uses v5 as the only practice runner and installs the interaction guard',()=>{
  assert.doesNotMatch(loader,/loadScript\('assets\/practice-exam-v4\.js'\)/);
  assert.match(loader,/loadScript\('assets\/practice-exam-v5\.js'\)/);
  assert.match(loader,/loadScript\('assets\/practice-interaction-fix-v1\.js'\)/);
  assert.match(loader,/loadStyle\('assets\/practice-interaction-fix-v1\.css'\)/);
});

test('service worker advances the cache and ships the interaction repair without v4 runtime',()=>{
  assert.match(sw,/finalforge-v60-practice-interaction/);
  assert.match(sw,/practice-interaction-fix-v1\.js/);
  assert.match(sw,/practice-interaction-fix-v1\.css/);
  assert.doesNotMatch(sw,/practice-exam-v4\.js/);
});
