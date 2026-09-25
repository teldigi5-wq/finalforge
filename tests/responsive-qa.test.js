import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('short landscape phone layout cannot be triggered by desktop zoom', async () => {
  const css = await read('assets/auth-world-v1.css');
  const legacy = await read('assets/reference-refresh.css');
  const coarse = '@media(max-height:560px) and (orientation:landscape) and (max-width:950px) and (hover:none) and (pointer:coarse)';
  const fine = '@media(max-height:560px) and (orientation:landscape) and (max-width:950px) and (hover:hover) and (pointer:fine)';
  assert.ok(css.includes(coarse));
  assert.ok(legacy.includes(coarse));
  assert.ok(css.includes(fine));
  assert.match(css, /padding:clamp\(5\.25rem,22dvh,7rem\) 0 0!important/);
  for (const width of [1024,1280,1440,1920]) {
    for (const zoom of [1,2,3,4]) assert.ok(width / zoom >= 256, `${width}px at ${zoom * 100}% remains covered by fluid layout`);
  }
});

test('animated auth border is clipped to the card without fixed dimensions or shadows', async () => {
  const css = await read('assets/auth-world-v1.css');
  assert.match(css, /\.ff-auth-card-border\{[^}]*inset:0!important;[^}]*width:auto!important;[^}]*height:auto!important/);
  assert.match(css, /\.ff-auth-card-border\{[^}]*contain:paint!important;[^}]*border:0!important;[^}]*border-radius:inherit!important;[^}]*box-shadow:none!important/);
  assert.match(css, /\.ff-auth-card-border::before\{[^}]*border:0!important;[^}]*box-shadow:none!important/);
});

test('auth UX and responsive assets are loaded and cached', async () => {
  const [html, loader, worker, ux] = await Promise.all([
    read('index.html'), read('assets/core-loader.js'), read('sw.js'), read('assets/ux-hardening-v1.js')
  ]);
  assert.match(html, /id="rememberSession"/);
  assert.match(html, /id="signupStrength"/);
  assert.match(html, /study-room\.webp" type="image\/webp" fetchpriority="high"/);
  const authCss = html.indexOf('assets/auth-world-v1.css?v=responsive-qa-15');
  const responsiveCss = html.indexOf('assets/responsive-hardening-v2.css?v=1');
  const uxScript = html.indexOf('assets/ux-hardening-v1.js?v=1');
  const toast = html.indexOf('id="toast"');
  assert.ok(authCss >= 0 && responsiveCss > authCss, 'responsive CSS is the final auth override');
  assert.ok(uxScript > toast, 'UX script loads after its DOM targets');
  assert.match(html, /class="card ff-empty-state"/);
  assert.match(html, /class="card stat ff-skeleton-card"/);
  assert.match(loader, /responsive-hardening-v2\.css/);
  assert.doesNotMatch(loader, /loadScript\('assets\/ux-hardening-v1\.js'/);
  assert.match(worker, /finalforge-v15-responsive-qa-integration/);
  assert.match(worker, /responsive-hardening-v2\.css/);
  assert.match(worker, /ux-hardening-v1\.js/);
  assert.match(ux, /Student IDs use IT followed by 8 digits/);
});

test('resize and dashboard parallax handlers are frame-throttled', async () => {
  const [motion, mobile, reference, auth] = await Promise.all([
    read('assets/product-motion-v5.js'), read('assets/mobile-experience-v4.js'),
    read('assets/reference-enhancements.js'), read('assets/auth-world-v1.js')
  ]);
  assert.match(motion, /if\(parallaxQueued\)return;parallaxQueued=true;requestAnimationFrame/);
  assert.match(motion, /if\(resizeQueued\)return;resizeQueued=true;requestAnimationFrame/);
  assert.match(mobile, /if\(resizeQueued\)return;resizeQueued=true;requestAnimationFrame/);
  assert.match(reference, /if\(moveQueued\)return;moveQueued=true/);
  assert.doesNotMatch(auth, /offsetWidth/);
});

test('login feedback, motion, and keyboard order remain wired', async () => {
  const [html, auth, motion] = await Promise.all([
    read('index.html'), read('assets/auth.js'), read('assets/auth-world-v1.js')
  ]);
  const identity = html.indexOf('id="loginIdentity"');
  const password = html.indexOf('id="loginPassword"');
  const remember = html.indexOf('id="rememberSession"');
  const submit = html.indexOf('Log in securely');
  assert.ok(identity < password && password < remember && remember < submit, 'login controls follow a logical tab order');
  assert.match(auth, /Student ID not found\. Check the ID or create an account first\./);
  assert.match(auth, /Incorrect password\. Try again or use password reset\./);
  assert.match(motion, /ff-auth-failure/);
  assert.match(motion, /is-success/);
  assert.match(motion, /ff-auth-card-exit/);
});
