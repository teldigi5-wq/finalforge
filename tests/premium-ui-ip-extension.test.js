import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const premium = fs.readFileSync(new URL('../assets/premium-ui-v1.js', import.meta.url), 'utf8');
const ip = fs.readFileSync(new URL('../assets/ip-paper-extension-v1.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/premium-shell-v1.css', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../assets/core-loader.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('premium UI layers parse and remain observer-free', () => {
  assert.doesNotThrow(() => new Function(premium));
  assert.doesNotThrow(() => new Function(ip));
  assert.doesNotMatch(premium, /MutationObserver|setInterval/);
  assert.doesNotMatch(ip, /MutationObserver|setInterval/);
  assert.match(premium, /FINALFORGE_PREMIUM_UI_V1/);
});

test('IP extension adds substantial source-aligned mock and hard-paper inventory', () => {
  assert.match(ip, /FINALFORGE_IP_PAPER_EXTENSION_V1/);
  assert.match(ip, /Mock Paper 2/);
  assert.match(ip, /Mock Paper 3/);
  assert.match(ip, /Hard Paper 1/);
  assert.match(ip, /Hard Paper 4/);
  assert.ok((ip.match(/"q":/g) || []).length >= 42);
  assert.match(ip, /parallel arrays/i);
  assert.match(ip, /2D arrays/i);
  assert.match(ip, /methods/i);
  assert.match(ip, /Double\.MAX_VALUE/);
  assert.match(ip, /Character\.toUpperCase/);
});

test('premium stylesheet stays responsive and avoids perpetual animation', () => {
  assert.match(css, /ff-stability-mode/);
  assert.match(css, /ff-premium-trust/);
  assert.match(css, /ff-ip-paper-grid/);
  assert.match(css, /@media\(max-width:1180px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /animation\s*:\s*[^;]*infinite/i);
});

test('loader and service worker ship the premium stability assets without restoring heavy runtimes', () => {
  assert.match(loader, /premium-shell-v1\.css/);
  assert.match(loader, /premium-ui-v1\.js/);
  assert.match(loader, /ip-paper-extension-v1\.js/);
  assert.doesNotMatch(loader, /loadScript\('assets\/product-motion-v5\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/tailwind-runtime-v6\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/professional-workspace-v2\.js'\)/);
  assert.match(sw, /finalforge-v53-premium-stable/);
  assert.match(sw, /premium-shell-v1\.css/);
  assert.match(sw, /premium-ui-v1\.js/);
  assert.match(sw, /ip-paper-extension-v1\.js/);
});
