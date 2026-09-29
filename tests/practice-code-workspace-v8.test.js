import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/practice-code-workspace-v8.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-code-workspace-v8.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('Java workspace v8 parses and remains event-driven',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
  assert.match(runtime,/FINALFORGE_CODE_WORKSPACE_V8/);
  assert.match(runtime,/version:'8\.1\.0'/);
  assert.match(runtime,/finalforge_exam_v4_active/);
  assert.match(runtime,/queueEnhance/);
  assert.match(runtime,/finalforge-after-navigate/);
  assert.match(runtime,/finalforge-ready/);
  assert.doesNotMatch(runtime,/MutationObserver/);
  assert.doesNotMatch(runtime,/setInterval/);
});

test('Java editor adds line numbers, cursor metrics, safe indentation and syntax preview',()=>{
  assert.match(runtime,/data-v8-lines/);
  assert.match(runtime,/cursorPosition/);
  assert.match(runtime,/Ln \$\{cursor\.line\}, Col \$\{cursor\.column\}/);
  assert.match(runtime,/highlightJava/);
  assert.match(runtime,/JAVA_KEYWORDS/);
  assert.match(runtime,/cls='keyword'/);
  assert.match(runtime,/ff-v8-token-\$\{cls\}/);
  assert.match(runtime,/event\.key==='Tab'/);
  assert.match(runtime,/autoIndent/);
  assert.match(runtime,/Ctrl\/⌘ \+ Enter/);
  assert.match(runtime,/data-v8-syntax/);
  assert.match(runtime,/Main\.java/);
});

test('Java workspace keeps compiler opt-in and stores practice I/O only in browser attempt data',()=>{
  assert.match(runtime,/data-compiler-open/);
  assert.match(runtime,/queueCompilerPolish/);
  assert.match(runtime,/External OneCompiler sandbox/);
  assert.match(runtime,/Copy STDIN & open compiler/);
  assert.match(runtime,/I\/O → STDIN/);
  assert.match(runtime,/finalforge_java_stdin_v1/);
  assert.match(runtime,/finalforge_java_workspace_v2/);
  assert.match(runtime,/localStorage\.setItem\(stdinKey/);
  assert.match(runtime,/navigator\.clipboard/);
  assert.match(runtime,/FinalForge does not securely execute or grade Java code/);
  assert.doesNotMatch(runtime,/Authorization|Firebase|Supabase|FINALFORGE_SUPABASE_SECRET_KEY/);
});

test('Java workspace includes a persisted self-review rubric without claiming awarded marks',()=>{
  assert.match(runtime,/rubricPoints/);
  assert.match(runtime,/data-v8-rubric-index/);
  assert.match(runtime,/data-v8-rubric-score/);
  assert.match(runtime,/self-review only/);
  assert.match(runtime,/not an awarded mark/);
  assert.match(runtime,/writeWorkspace/);
});

test('Java workspace styling is responsive, accessible and low motion',()=>{
  assert.match(css,/Practice Code Workspace v8/);
  assert.match(css,/ff-v8-editor-frame/);
  assert.match(css,/ff-v8-gutter/);
  assert.match(css,/ff-v8-syntax-preview/);
  assert.match(css,/ff-v8-practice-tools/);
  assert.match(css,/ff-v8-io-grid/);
  assert.match(css,/ff-v8-rubric-list/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:460px\)/);
  assert.match(css,/font-size:16px!important/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker certify v72 Java workspace',()=>{
  assert.match(loader,/product-v72-java-workspace/);
  assert.match(loader,/practice-code-workspace-v8\.css/);
  assert.match(loader,/practice-code-workspace-v8\.js/);
  assert.match(sw,/finalforge-v72-java-workspace/);
  assert.match(sw,/\.\/assets\/practice-code-workspace-v8\.js/);
  assert.match(sw,/\.\/assets\/practice-code-workspace-v8\.css/);
});
