import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appearance = fs.readFileSync(new URL('../assets/appearance-v1.js', import.meta.url), 'utf8');
const stability = fs.readFileSync(new URL('../assets/theme-toggle-stability-v1.js', import.meta.url), 'utf8');
const responsive = fs.readFileSync(new URL('../assets/auth-responsive-hotfix-v1.css', import.meta.url), 'utf8');
const cloud = fs.readFileSync(new URL('../assets/cloud-ui-stability-v1.js', import.meta.url), 'utf8');
const tailwind = fs.readFileSync(new URL('../assets/tailwind-runtime-v6.js', import.meta.url), 'utf8');
const motion = fs.readFileSync(new URL('../assets/product-motion-v5.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('theme runtime parses and bounds repeated toggles', () => {
  assert.doesNotThrow(() => new Function(appearance));
  assert.doesNotThrow(() => new Function(stability));
  assert.match(appearance, /FINALFORGE_APPEARANCE_V2/);
  assert.match(appearance, /guard\?\.begin/);
  assert.match(appearance, /requestAnimationFrame/);
  assert.match(appearance, /guard\?\.end/);
  assert.match(stability, /if\(switching\)return false/);
  assert.match(stability, /ff-theme-switching/);
});

test('auth responsive hotfix prevents horizontal scrolling and legacy duplicate status', () => {
  assert.match(responsive, /#authGate \.auth-card\{[\s\S]*overflow-x:hidden!important/);
  assert.match(responsive, /#authGate #authBootStatus\{[\s\S]*display:none!important/);
  assert.match(responsive, /#authGate \.auth-card>\*/);
  assert.match(responsive, /scrollbar-gutter:stable/);
});

test('responsive auth covers desktop, tablet, phone, narrow phone, and landscape', () => {
  assert.match(responsive, /max-width:1180px/);
  assert.match(responsive, /max-width:980px/);
  assert.match(responsive, /max-width:720px/);
  assert.match(responsive, /max-width:520px/);
  assert.match(responsive, /max-width:380px/);
  assert.match(responsive, /orientation:landscape/);
  assert.match(responsive, /prefers-reduced-motion:reduce/);
});

test('theme stability marks auth v2 stylesheet and recovers auth-only transient locks', () => {
  assert.match(stability, /finalforgeAuthV2/);
  assert.match(stability, /body\?\.classList\.contains\('auth-pending'\)/);
  assert.match(stability, /ff-scroll-locked/);
  assert.match(stability, /mobile-nav-more-open/);
  assert.match(stability, /ff-v2-palette-open/);
});

test('post-login cloud hydration is coalesced instead of synchronously rebuilding the app', () => {
  assert.doesNotThrow(() => new Function(cloud));
  assert.match(cloud, /finalforge-cloud-render-complete/);
  assert.match(cloud, /requestAnimationFrame\(flushOne\)/);
  assert.match(cloud, /queue\.set\(name/);
  assert.match(cloud, /name==='renderPractice'/);
});

test('decorative runtimes are event-driven and do not install app-wide mutation observers', () => {
  assert.doesNotThrow(() => new Function(tailwind));
  assert.doesNotThrow(() => new Function(motion));
  assert.doesNotMatch(tailwind, /observer\.observe\(app/);
  assert.doesNotMatch(motion, /mo\.observe\(app/);
  assert.match(tailwind, /finalforge-cloud-render-complete/);
  assert.match(motion, /window\.finalforgeRefreshEffects=scheduleRefresh/);
});

test('service worker cache is bumped and stability runtimes are network-first critical assets', () => {
  assert.match(sw, /finalforge-v51-dashboard-stability/);
  const critical = sw.slice(sw.indexOf('const CRITICAL_RUNTIME'), sw.indexOf("self.addEventListener('install'"));
  assert.match(critical, /appearance-v1\.js/);
  assert.match(critical, /auth-responsive-hotfix-v1\.css/);
  assert.match(critical, /theme-toggle-stability-v1\.js/);
  assert.match(critical, /cloud-ui-stability-v1\.js/);
  assert.match(critical, /tailwind-runtime-v6\.js/);
  assert.match(critical, /product-motion-v5\.js/);
});
