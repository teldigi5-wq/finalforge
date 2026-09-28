import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appearance=fs.readFileSync(new URL('../assets/appearance-v1.js',import.meta.url),'utf8');
const theme=fs.readFileSync(new URL('../assets/theme-toggle-stability-v1.js',import.meta.url),'utf8');
const responsive=fs.readFileSync(new URL('../assets/auth-responsive-hotfix-v1.css',import.meta.url),'utf8');
const stability=fs.readFileSync(new URL('../assets/stability-runtime-v1.js',import.meta.url),'utf8');
const stabilityCss=fs.readFileSync(new URL('../assets/stability-mode-v1.css',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../assets/core-loader.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('theme runtime parses and bounds repeated toggles',()=>{
  assert.doesNotThrow(()=>new Function(appearance));
  assert.doesNotThrow(()=>new Function(theme));
  assert.match(appearance,/FINALFORGE_APPEARANCE_V2/);
  assert.match(theme,/if\(switching\)return false/);
});

test('auth responsive hotfix prevents horizontal overflow',()=>{
  assert.match(responsive,/overflow-x:hidden!important/);
  assert.match(responsive,/scrollbar-gutter:stable/);
  assert.match(responsive,/max-width:980px/);
  assert.match(responsive,/max-width:520px/);
  assert.match(responsive,/orientation:landscape/);
});

test('stability runtime coalesces renderers instead of running them inline',()=>{
  assert.doesNotThrow(()=>new Function(stability));
  assert.match(stability,/FINALFORGE_STABILITY_RUNTIME_V1/);
  assert.match(stability,/requestAnimationFrame\(flushOne\)/);
  assert.match(stability,/renderModules/);
  assert.match(stability,/renderResources/);
  assert.match(stability,/renderPractice/);
  assert.match(stability,/window\.finalforgeRefreshEffects=\(\)=>\{\}/);
});

test('stability CSS disables expensive motion and inactive section painting',()=>{
  assert.match(stabilityCss,/animation:none!important/);
  assert.match(stabilityCss,/transition:none!important/);
  assert.match(stabilityCss,/backdrop-filter:none!important/);
  assert.match(stabilityCss,/\.section:not\(\.active\)/);
});

test('loader keeps stability mode and omits heavy decorative runtime layers',()=>{
  assert.doesNotThrow(()=>new Function(loader));
  assert.match(loader,/loadScript\('assets\/stability-runtime-v1\.js'\)/);
  assert.match(loader,/loadStyle\('assets\/stability-mode-v1\.css'\)/);
  assert.match(loader,/loadStyle\('assets\/auth-responsive-hotfix-v1\.css'\)/);
  assert.match(loader,/loadScript\('assets\/theme-toggle-stability-v1\.js'\)/);
  assert.doesNotMatch(loader,/await loadScript\('assets\/product-motion-v5\.js'\)/);
  assert.doesNotMatch(loader,/await loadScript\('assets\/tailwind-runtime-v6\.js'\)/);
  assert.doesNotMatch(loader,/await loadScript\('assets\/professional-workspace-v2\.js'\)/);
  assert.doesNotMatch(loader,/await loadScript\('assets\/student-experience-v2\.js'\)/);
  assert.doesNotMatch(loader,/await loadScript\('assets\/cloud-ui-stability-v1\.js'\)/);
});

test('service worker is bumped and stability plus premium runtime are network-fresh critical',()=>{
  assert.match(sw,/finalforge-v53-premium-stable/);
  assert.match(sw,/stability-runtime-v1\.js/);
  assert.match(sw,/stability-mode-v1\.css/);
  assert.match(sw,/premium-ui-v1\.js/);
  assert.match(sw,/premium-shell-v1\.css/);
  assert.match(sw,/ip-paper-extension-v1\.js/);
  const critical=sw.slice(sw.indexOf('const CRITICAL_RUNTIME'),sw.indexOf("self.addEventListener('install'"));
  assert.match(critical,/stability-runtime-v1\.js/);
  assert.match(critical,/auth\.js/);
  assert.match(critical,/theme-toggle-stability-v1\.js/);
  assert.match(critical,/premium-ui-v1\.js/);
  assert.match(critical,/ip-paper-extension-v1\.js/);
});
