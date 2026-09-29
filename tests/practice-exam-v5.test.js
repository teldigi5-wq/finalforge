import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const blueprint=fs.readFileSync(new URL('../assets/ip-final-blueprint-v5.js',import.meta.url),'utf8');
const runner=fs.readFileSync(new URL('../assets/practice-exam-v5.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-premium-v5.css',import.meta.url),'utf8');
const comfort=fs.readFileSync(new URL('../assets/premium-comfort-v1.css',import.meta.url),'utf8');
const stability=fs.readFileSync(new URL('../assets/practice-stability-v1.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('IP v5 blueprint parses and covers all ten coverage slots with code-tracing questions',()=>{
  assert.doesNotThrow(()=>new Function(blueprint));
  assert.match(blueprint,/FINALFORGE_IP_FINAL_BLUEPRINT_V5/);
  assert.match(blueprint,/mcq:25/);
  assert.match(blueprint,/code:2/);
  assert.match(blueprint,/Lectures 1–10/);
  for(let slot=1;slot<=10;slot++){
    const matches=blueprint.match(new RegExp(`coverage:${slot}(?:,|})`,'g'))||[];
    assert.ok(matches.length>=2,`coverage slot ${slot} should have at least two questions`);
  }
  const snippets=(blueprint.match(/snippet:`/g)||[]).length;
  assert.ok(snippets>=20,`expected >=20 Java tracing snippets, got ${snippets}`);
  const modelCode=(blueprint.match(/model2026:true/g)||[]).length;
  assert.ok(modelCode>=8,`expected >=8 original model coding tasks, got ${modelCode}`);
});

test('Exam Studio v5 fixes answer-scroll regression and keeps navigation explicit',()=>{
  assert.doesNotThrow(()=>new Function(runner));
  assert.match(runner,/FINALFORGE_PRACTICE_V5/);
  assert.match(runner,/balancedIpMcq/);
  assert.match(runner,/\[1,2,3,4\]\.map/);
  assert.match(runner,/Next question/);
  assert.match(runner,/data-exam-next/);
  assert.match(runner,/scheduleSave\(\);updateRail\(\)/);
  assert.doesNotMatch(runner,/addEventListener\('change',[\s\S]{0,420}renderExam\(/);
  assert.doesNotMatch(runner,/window\.scrollTo\(\{top:0/);
  assert.match(runner,/scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
});

test('Java compiler is opt-in, bounded to the active frame and documented as practice-only',()=>{
  assert.match(runner,/https:\/\/onecompiler\.com\/embed\/java/);
  assert.match(runner,/data-compiler-open/);
  assert.match(runner,/Practice compiler only/);
  assert.match(runner,/event\.source!==activeCompilerFrame\.contentWindow/);
  assert.match(runner,/OC_ORIGINS\.has\(event\.origin\)/);
  assert.match(runner,/eventType:'populateCode'/);
  assert.match(runner,/eventType:'triggerRun'/);
  assert.match(runner,/disableAutoComplete=true/);
});

test('Exam Studio styling is premium, responsive and stability-first',()=>{
  assert.match(css,/ff-v5-pattern-card/);
  assert.match(css,/ff-v5-code-trace/);
  assert.match(css,/ff-v5-compiler-frame/);
  assert.match(css,/ff-v5-sticky-actions/);
  assert.match(css,/position:sticky/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('premium comfort layer protects click targets and reduces glare',()=>{
  assert.match(comfort,/Premium Comfort v1/);
  assert.match(comfort,/pointer-events:none!important/);
  assert.match(comfort,/ff-v5-sticky-actions/);
  assert.match(comfort,/button:not\(:disabled\)/);
  assert.match(comfort,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(comfort,/animation\s*:\s*[^;]*infinite/i);
});

test('certified bootstrap actively loads Exam Studio v5 and comfort assets',()=>{
  assert.doesNotThrow(()=>new Function(stability));
  assert.match(loader,/ip-final-blueprint-v5\.js/);
  assert.match(loader,/practice-exam-v5\.js/);
  assert.match(loader,/practice-premium-v5\.css/);
  assert.match(loader,/premium-studyhub-v2\.css/);
  assert.match(loader,/premium-comfort-v1\.css/);
  assert.match(loader,/premium-comfort-v59/);
  assert.match(sw,/finalforge-v59-premium-comfort/);
  assert.match(sw,/ip-final-blueprint-v5\.js/);
  assert.match(sw,/practice-exam-v5\.js/);
  assert.match(sw,/practice-premium-v5\.css/);
  assert.match(sw,/premium-comfort-v1\.css/);
});
