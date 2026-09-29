import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const premium = fs.readFileSync(new URL('../assets/premium-ui-v1.js', import.meta.url), 'utf8');
const ip = fs.readFileSync(new URL('../assets/ip-paper-extension-v1.js', import.meta.url), 'utf8');
const challenge = fs.readFileSync(new URL('../assets/ip-challenge-v2.js', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../assets/workspace-v3.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/premium-shell-v1.css', import.meta.url), 'utf8');
const workspaceCss = fs.readFileSync(new URL('../assets/workspace-v3.css', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../assets/core-loader.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('premium and workspace UI layers parse and remain observer-free', () => {
  assert.doesNotThrow(() => new Function(premium));
  assert.doesNotThrow(() => new Function(ip));
  assert.doesNotThrow(() => new Function(challenge));
  assert.doesNotThrow(() => new Function(workspace));
  for(const source of [premium,ip,challenge,workspace]){
    assert.doesNotMatch(source, /MutationObserver|setInterval/);
  }
  assert.match(premium, /FINALFORGE_PREMIUM_UI_V1/);
  assert.match(workspace, /FINALFORGE_WORKSPACE_V3/);
});

test('IP extensions add substantial source-aligned mock, hard and challenge inventory', () => {
  assert.match(ip, /FINALFORGE_IP_PAPER_EXTENSION_V1/);
  assert.match(challenge, /FINALFORGE_IP_CHALLENGE_V2/);
  assert.match(ip, /Mock Paper 2/);
  assert.match(ip, /Mock Paper 3/);
  assert.match(ip, /Hard Paper 1/);
  assert.match(ip, /Hard Paper 4/);
  assert.match(challenge, /Challenge Paper/);
  assert.match(challenge, /parallel arrays/i);
  assert.match(challenge, /2D array/i);
  assert.match(challenge, /methods/i);
  assert.match(challenge, /Double\.MAX_VALUE/);
  assert.match(challenge, /Character\.toUpperCase/);
  const challengeQuestionCount=(challenge.match(/\{q:/g)||[]).length;
  assert.ok(challengeQuestionCount >= 40, `expected >= 40 challenge questions, got ${challengeQuestionCount}`);
});

test('workspace adds command search, analytics and responsive module intelligence', () => {
  assert.match(workspace, /Search FinalForge/);
  assert.match(workspace, /Progress you can act on/);
  assert.match(workspace, /ffV3ModuleOverview/);
  assert.match(workspace, /finalforge-after-navigate/);
  assert.match(workspace, /event\.ctrlKey\|\|event\.metaKey/);
  assert.match(workspaceCss, /ff-v3-command-panel/);
  assert.match(workspaceCss, /ff-v3-module-overview/);
  assert.match(workspaceCss, /ff-v3-analytics-grid/);
  assert.match(workspaceCss, /@media\(max-width:1180px\)/);
  assert.match(workspaceCss, /@media\(max-width:900px\)/);
  assert.match(workspaceCss, /@media\(max-width:520px\)/);
  assert.match(workspaceCss, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(workspaceCss, /animation\s*:\s*[^;]*infinite/i);
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

test('loader and service worker ship workspace v3 without restoring heavy runtimes', () => {
  assert.match(loader, /premium-shell-v1\.css/);
  assert.match(loader, /workspace-v3\.css/);
  assert.match(loader, /premium-ui-v1\.js/);
  assert.match(loader, /workspace-v3\.js/);
  assert.match(loader, /ip-paper-extension-v1\.js/);
  assert.match(loader, /ip-challenge-v2\.js/);
  assert.doesNotMatch(loader, /loadScript\('assets\/product-motion-v5\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/tailwind-runtime-v6\.js'\)/);
  assert.doesNotMatch(loader, /loadScript\('assets\/professional-workspace-v2\.js'\)/);
  assert.match(sw, /finalforge-v54-workspace-v3/);
  assert.match(sw, /workspace-v3\.css/);
  assert.match(sw, /workspace-v3\.js/);
  assert.match(sw, /ip-challenge-v2\.js/);
});