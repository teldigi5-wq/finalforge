import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/reference-ui-v76.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../assets/mobile-scroll-recovery-v1.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('authenticated desktop shell has one sidebar track and no duplicate main offset',()=>{
  assert.match(css,/grid-template-columns:190px minmax\(0,1fr\)!important/);
  assert.match(css,/body\.ff-authenticated \.main\{\s*margin-left:0!important/);
});

test('utility bar cannot collapse the account identity into vertical text',()=>{
  assert.match(css,/body\.ff-authenticated \.topbar\{\s*display:flex!important/);
  assert.match(css,/\.top-account-wrap\{[\s\S]*?grid-column:auto!important/);
  assert.match(css,/\.account-copy b,[\s\S]*?white-space:nowrap!important/);
  assert.match(css,/\.account-chip\{[\s\S]*?height:34px!important/);
});

test('updated workspace shell bypasses stale cached presentation CSS',()=>{
  assert.match(bootstrap,/reference-ui-v76\.css\?v=reference-ui-v76/);
  assert.match(sw,/finalforge-v79-workspace-shell/);
});
