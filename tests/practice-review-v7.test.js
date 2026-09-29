import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/practice-review-v7.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-review-v7.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('smart review runtime parses and stays event-driven',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_PRACTICE_REVIEW_V7/);
  assert.match(runtime,/finalforge_exam_v7_insights/);
  assert.match(runtime,/buildInsight/);
  assert.match(runtime,/finalforge-exam-time-expired/);
  assert.match(runtime,/finalforge-after-navigate/);
  assert.match(runtime,/finalforge-practice-insight-saved/);
  assert.doesNotMatch(runtime,/MutationObserver/);
  assert.doesNotMatch(runtime,/setInterval/);
});

test('smart review distinguishes wrong, correct, unanswered and self-mark states',()=>{
  assert.match(runtime,/return Number\(value\)===Number\(question\.a\)\?'correct':'incorrect'/);
  assert.match(runtime,/return 'unanswered'/);
  assert.match(runtime,/return 'self-mark'/);
  assert.match(runtime,/data-v7-filter="needs-review"/);
  assert.match(runtime,/data-v7-filter="correct"/);
  assert.match(runtime,/data-v7-filter="unanswered"/);
  assert.match(runtime,/Correct/);
  assert.match(runtime,/Needs review/);
});

test('review analytics are explicitly MCQ-based and expose weak topics',()=>{
  assert.match(runtime,/mcqTotal/);
  assert.match(runtime,/mcqCorrect/);
  assert.match(runtime,/needsReview/);
  assert.match(runtime,/strongest/);
  assert.match(runtime,/performanceLabel/);
  assert.match(runtime,/Readiness is based only on auto-marked MCQs/);
  assert.match(runtime,/Recommended next step/);
  assert.match(runtime,/Recent exam readiness/);
});

test('premium review styling is responsive, accessible and low motion',()=>{
  assert.match(css,/Practice Review v7/);
  assert.match(css,/ff-v7-summary/);
  assert.match(css,/ff-v7-topic-meter/);
  assert.match(css,/ff-v7-review-filter/);
  assert.match(css,/ff-v7-state-correct/);
  assert.match(css,/ff-v7-state-incorrect/);
  assert.match(css,/ff-v7-state-unanswered/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker certify v71 assets',()=>{
  assert.match(loader,/product-v71-smart-review/);
  assert.match(loader,/practice-review-v7\.css/);
  assert.match(loader,/practice-review-v7\.js/);
  assert.match(sw,/finalforge-v71-smart-exam-review/);
  assert.match(sw,/\.\/assets\/practice-review-v7\.js/);
  assert.match(sw,/\.\/assets\/practice-review-v7\.css/);
});