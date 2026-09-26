import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('professional workspace never uses touch capability as layout authority',async()=>{
  const css=await read('assets/professional-workspace-v2.css');
  assert.doesNotMatch(css,/pointer\s*:\s*coarse/i);
  assert.doesNotMatch(css,/hover\s*:\s*none/i);
  assert.doesNotMatch(css,/max-device-width/i);
  assert.match(css,/@media \(min-width:901px\) and \(max-width:1180px\)/);
  assert.match(css,/@media \(min-width:701px\) and \(max-width:900px\)/);
  assert.match(css,/@media \(max-width:700px\)/);
  assert.match(css,/html\.ff-real-mobile body:not\(\.auth-pending\)/);
});

test('professional workspace respects the canonical router',async()=>{
  const js=await read('assets/professional-workspace-v2.js');
  assert.doesNotMatch(js,/window\.go\s*=(?!=)/);
  assert.doesNotMatch(js,/function\s+go\s*\(/);
  assert.match(js,/window\.finalforgeAfterNavigate/);
  assert.match(js,/window\.go\('analytics'\)/);
  assert.match(js,/section\.id='analytics'/);
});

test('professional presentation styles load deterministically before app boot completes',async()=>{
  const [loader,app]=await Promise.all([read('assets/core-loader.js'),read('assets/app.js')]);
  const workspaceStyle=loader.indexOf("loadStyle('assets/professional-workspace-v2.css')");
  const accessibilityStyle=loader.indexOf("loadStyle('assets/professional-accessibility-v1.css')");
  const appScript=loader.indexOf("loadScript('assets/app.js')");
  assert.ok(workspaceStyle>=0,'professional workspace stylesheet is loader-owned');
  assert.ok(accessibilityStyle>workspaceStyle,'accessibility layer follows the professional visual layer');
  assert.ok(appScript>accessibilityStyle,'both professional styles finish before app.js runs');
  assert.doesNotMatch(app,/createElement\('link'\)/);
  assert.doesNotMatch(app,/professional-accessibility-v1\.css/);
  assert.match(loader,/const VERSION='professional-hardening-v1'/);
});

test('professional workspace is loaded after responsive runtime ownership',async()=>{
  const loader=await read('assets/core-loader.js');
  const device=loader.indexOf("loadScript('assets/mobile-runtime-final-v1.js')");
  const nav=loader.indexOf("loadScript('assets/mobile-navigation-runtime-v2.js')");
  const workspace=loader.indexOf("loadScript('assets/professional-workspace-v2.js')");
  assert.ok(device>=0,'device policy is loaded');
  assert.ok(nav>device,'mobile navigation follows device policy');
  assert.ok(workspace>nav,'professional workspace follows functional runtime ownership');
});

test('professional workspace is available offline through the v48 cache',async()=>{
  const worker=await read('sw.js');
  assert.match(worker,/finalforge-v48-professional-hardening/);
  assert.match(worker,/professional-workspace-v2\.css/);
  assert.match(worker,/professional-accessibility-v1\.css/);
  assert.match(worker,/professional-workspace-v2\.js/);
  const critical=worker.slice(worker.indexOf('const CRITICAL_RUNTIME'),worker.indexOf("self.addEventListener('install'"));
  assert.match(critical,/professional-workspace-v2\.css/);
  assert.match(critical,/professional-accessibility-v1\.css/);
  assert.match(critical,/professional-workspace-v2\.js/);
});

test('analytics language does not claim to predict exam results',async()=>{
  const js=await read('assets/professional-workspace-v2.js');
  assert.match(js,/study aid, not an exam prediction/i);
  assert.match(js,/Revision priorities/);
  assert.match(js,/Cloud sync active/);
});
