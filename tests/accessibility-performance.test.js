import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('canonical navigation owns accessibility state',async()=>{
  const app=await read('assets/app.js');
  assert.match(app,/setAttribute\('aria-hidden'/);
  assert.match(app,/setAttribute\('inert',''\)/);
  assert.match(app,/removeAttribute\('inert'\)/);
  assert.match(app,/setAttribute\('aria-current','page'\)/);
  assert.match(app,/removeAttribute\('aria-current'\)/);
});

test('mobile module expansion never requests smooth scrolling',async()=>{
  const app=await read('assets/app.js');
  assert.match(app,/const behavior=isMobileRuntime\(\)\?'auto':'smooth'/);
  assert.match(app,/scrollIntoView\(\{behavior,block:'start'\}\)/);
});

test('hidden tabs do not keep repainting the home countdown',async()=>{
  const app=await read('assets/app.js');
  assert.match(app,/!document\.hidden&&\$\('#home'\)\?\.classList\.contains\('active'\)/);
  assert.match(app,/visibilitychange/);
});

test('resource filters expose pressed state to assistive technology',async()=>{
  const app=await read('assets/app.js');
  assert.match(app,/setAttribute\('aria-pressed',String\(active\)\)/);
});

test('professional accessibility layer covers keyboard, touch and tablet layouts',async()=>{
  const css=await read('assets/professional-accessibility-v1.css');
  assert.match(css,/:focus-visible/);
  assert.match(css,/min-width:901px\) and \(max-width:1050px/);
  assert.match(css,/max-width:900px/);
  assert.match(css,/min-height:44px/);
  assert.doesNotMatch(css,/pointer:coarse|hover:none|max-device-width/);
});
