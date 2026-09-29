import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/practice-adaptive-v9.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-adaptive-v9.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const accountStorage=fs.readFileSync(new URL('../assets/account-storage-v1.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('adaptive practice v9 parses and remains event-driven',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_PRACTICE_ADAPTIVE_V9/);
  assert.match(runtime,/version:'9\.0\.0'/);
  assert.match(runtime,/queueRender/);
  assert.match(runtime,/finalforge-practice-insight-saved/);
  assert.match(runtime,/finalforge-after-navigate/);
  assert.match(runtime,/finalforge-ready/);
  assert.doesNotMatch(runtime,/MutationObserver/);
  assert.doesNotMatch(runtime,/setInterval/);
});

test('adaptive recall is driven only by recent auto-marked MCQ insight',()=>{
  assert.match(runtime,/finalforge_exam_v7_insights/);
  assert.match(runtime,/MAX_RECENT=5/);
  assert.match(runtime,/summary\.weak/);
  assert.match(runtime,/Math\.round\(limit\*\.7\)/);
  assert.match(runtime,/focusTopics/);
  assert.match(runtime,/Targeting uses only recent auto-marked MCQ results/);
  assert.match(runtime,/Written and Java answers remain self-marked/);
});

test('adaptive and random recall launch version 5 Exam Studio attempts',()=>{
  assert.match(runtime,/finalforge_exam_v4_active/);
  assert.match(runtime,/version:5/);
  assert.match(runtime,/mode:adaptive\?'adaptive':'random-recall'/);
  assert.match(runtime,/20\*60000/);
  assert.match(runtime,/resumePracticeExam/);
  assert.match(runtime,/data-v9-adaptive/);
  assert.match(runtime,/data-v9-random/);
  assert.match(runtime,/data-start-mode=\\?"generated/);
  assert.match(runtime,/Generate full paper/);
});

test('adaptive state remains inside the existing UID-scoped FinalForge storage boundary',()=>{
  assert.match(accountStorage,/isAccountKey=key=>isFinalForgeKey/);
  assert.match(accountStorage,/ff_account_v1:/);
  assert.match(accountStorage,/storage\.getItem=getItem/);
  assert.match(accountStorage,/storage\.setItem=\(key,value\)=>setItem/);
  assert.match(runtime,/localStorage\.getItem/);
  assert.match(runtime,/localStorage\.setItem/);
  assert.doesNotMatch(runtime,/Firebase|Supabase|Authorization|FINALFORGE_SUPABASE_SECRET_KEY/);
});

test('adaptive practice CSS is scoped and responsive',()=>{
  assert.match(css,/Adaptive Practice v9/);
  assert.match(css,/\.ff-v9-adaptive/);
  assert.match(css,/\.ff-v9-grid/);
  assert.match(css,/\.ff-v9-card/);
  assert.match(css,/@media\(max-width:920px\)/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker certify v73 adaptive assets',()=>{
  assert.match(loader,/product-v73-adaptive-practice/);
  assert.match(loader,/practice-adaptive-v9\.css/);
  assert.match(loader,/practice-adaptive-v9\.js/);
  assert.ok(loader.indexOf("loadScript('assets/account-storage-v1.js')")<loader.indexOf("loadScript('assets/practice-adaptive-v9.js')"));
  assert.ok(loader.indexOf("loadScript('assets/practice-review-v7.js')")<loader.indexOf("loadScript('assets/practice-adaptive-v9.js')"));
  assert.match(sw,/finalforge-v73-adaptive-practice/);
  assert.match(sw,/\.\/assets\/practice-adaptive-v9\.js/);
  assert.match(sw,/\.\/assets\/practice-adaptive-v9\.css/);
  assert.match(sw,/protectedPath\(pathname\)/);
  assert.match(sw,/cache:'no-store'/);
});
