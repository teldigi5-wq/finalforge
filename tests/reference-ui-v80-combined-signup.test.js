import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../assets/reference-ui-v77.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/reference-ui-v77.css',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('signup keeps the public landing visible beside the real auth shell',()=>{
  assert.match(runtime,/landing\.hidden=mode!=='signup'/);
  assert.match(runtime,/mode==='signup'&&root\.classList\.contains\('ff-v77-public-auth'\)/);
  assert.match(css,/grid-template-columns:minmax\(500px,46%\) minmax\(700px,54%\)!important/);
  assert.match(css,/#ffPublicLanding\{\s*display:block!important;grid-column:1!important/);
  assert.match(css,/#authGate>\.auth-shell\{\s*grid-column:2!important/);
});

test('combined signup preserves the focused responsive form below desktop width',()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(min-width:1280px\) and \(max-width:1540px\)/);
  assert.match(css,/#signupForm\.active\{grid-template-columns:1fr!important/);
});

test('combined signup ships through a fresh offline cache',()=>{
  assert.match(sw,/finalforge-v80-combined-signup/);
  assert.match(sw,/finalforge-v78-premium-polish/);
});
