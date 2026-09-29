import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/student-readiness-v10.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/student-readiness-v10.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const accountStorage=fs.readFileSync(new URL('../assets/account-storage-v1.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('student readiness v10 parses and stays event-driven',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_STUDENT_READINESS_V10/);
  assert.match(runtime,/version:'10\.0\.0'/);
  assert.match(runtime,/queueRender/);
  assert.match(runtime,/finalforge-after-navigate/);
  assert.match(runtime,/finalforge-practice-insight-saved/);
  assert.match(runtime,/finalforge-account-storage-bound/);
  assert.doesNotMatch(runtime,/MutationObserver/);
  assert.doesNotMatch(runtime,/setInterval/);
});

test('readiness uses MCQ evidence without blending lesson completion into the score',()=>{
  assert.match(runtime,/finalforge_exam_v7_insights/);
  assert.match(runtime,/MAX_MODULE_ATTEMPTS=5/);
  assert.match(runtime,/MAX_OVERALL_ATTEMPTS=20/);
  assert.match(runtime,/readiness=average\(rows\.map\(row=>row\.percent\)\)/);
  assert.match(runtime,/studyCompletion=average\(moduleRows\.map\(row=>row\.completion\)\)/);
  assert.match(runtime,/Readiness uses only recent auto-marked MCQs/);
  assert.match(runtime,/Lesson completion is shown separately/);
  assert.match(runtime,/written and Java answers remain self-marked/);
  assert.match(runtime,/Completion never inflates the readiness percentage/);
});

test('readiness dashboard provides trends, weak topics and actionable module handoff',()=>{
  assert.match(runtime,/aggregateTopics/);
  assert.match(runtime,/weak=topics\.filter\(row=>row\.percent<75\)/);
  assert.match(runtime,/trend=latest!==null&&previous!==null\?latest-previous:null/);
  assert.match(runtime,/Module readiness matrix/);
  assert.match(runtime,/Recent auto-marked MCQs/);
  assert.match(runtime,/Weak-area signal/);
  assert.match(runtime,/data-v10-practice/);
  assert.match(runtime,/window\.go\?\.\('practice'\)/);
  assert.match(runtime,/window\.setPracticeMod\?\.\(module\)/);
  assert.match(runtime,/data-v10-module/);
});

test('readiness data remains inside the existing UID-scoped FinalForge storage boundary',()=>{
  assert.match(accountStorage,/isAccountKey=key=>isFinalForgeKey/);
  assert.match(accountStorage,/ff_account_v1:/);
  assert.match(accountStorage,/storage\.getItem=getItem/);
  assert.match(runtime,/localStorage\.getItem/);
  assert.doesNotMatch(runtime,/Firebase|Supabase|Authorization|FINALFORGE_SUPABASE_SECRET_KEY/);
});

test('student readiness CSS is scoped, responsive and low motion',()=>{
  assert.match(css,/Student Readiness v10/);
  assert.match(css,/\.ff-v10-readiness-hero/);
  assert.match(css,/\.ff-v10-module-matrix/);
  assert.match(css,/\.ff-v10-analytics-grid/);
  assert.match(css,/\.ff-v10-trend-bars/);
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker certify v74 readiness assets',()=>{
  assert.match(loader,/product-v74-student-readiness/);
  assert.match(loader,/student-readiness-v10\.css/);
  assert.match(loader,/student-readiness-v10\.js/);
  assert.ok(loader.indexOf("loadScript('assets/account-storage-v1.js')")<loader.indexOf("loadScript('assets/student-readiness-v10.js')"));
  assert.ok(loader.indexOf("loadScript('assets/workspace-v3.js')")<loader.indexOf("loadScript('assets/student-readiness-v10.js')"));
  assert.ok(loader.indexOf("loadScript('assets/practice-adaptive-v9.js')")<loader.indexOf("loadScript('assets/student-readiness-v10.js')"));
  assert.match(sw,/finalforge-v74-student-readiness/);
  assert.match(sw,/\.\/assets\/student-readiness-v10\.js/);
  assert.match(sw,/\.\/assets\/student-readiness-v10\.css/);
  assert.match(sw,/protectedPath\(pathname\)/);
  assert.match(sw,/cache:'no-store'/);
});
