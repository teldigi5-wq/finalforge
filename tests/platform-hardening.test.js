import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('PWA manifest has stable app identity and scope',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.id,'/');
  assert.equal(manifest.start_url,'/');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.categories.includes('education'));
  assert.ok(manifest.categories.includes('productivity'));
});

test('deployment headers harden transport and service-worker updates',async()=>{
  const config=JSON.parse(await read('vercel.json'));
  const allHeaders=config.headers.find(item=>item.source==='/(.*)')?.headers||[];
  const swHeaders=config.headers.find(item=>item.source==='/sw.js')?.headers||[];
  const map=Object.fromEntries(allHeaders.map(item=>[item.key,item.value]));
  assert.equal(map['X-Content-Type-Options'],'nosniff');
  assert.equal(map['X-Frame-Options'],'SAMEORIGIN');
  assert.match(map['Strict-Transport-Security']||'',/max-age=31536000/);
  assert.match(map['Permissions-Policy']||'',/camera=\(\)/);
  assert.match(swHeaders.find(item=>item.key==='Cache-Control')?.value||'',/no-store/);
});

test('rating endpoint rejects oversized request bodies before Firestore work',async()=>{
  const source=await read('api/rate.js');
  const payloadGuard=source.indexOf("content-length");
  const servicesCall=source.indexOf('const store = services()');
  assert.ok(payloadGuard>=0&&payloadGuard<servicesCall);
  assert.match(source,/status\(413\)/);
  assert.match(source,/Request too large/);
});

test('service worker precaches the PWA manifest and professional runtime',async()=>{
  const worker=await read('sw.js');
  assert.match(worker,/\.\/manifest\.webmanifest/);
  assert.match(worker,/\/manifest\.webmanifest/);
  assert.match(worker,/professional-workspace-v2\.css/);
  assert.match(worker,/professional-workspace-v2\.js/);
});

test('404 page is branded, responsive and excluded from search indexing',async()=>{
  const page=await read('404.html');
  assert.match(page,/name="robots" content="noindex,nofollow"/);
  assert.match(page,/finalforge-logo-256\.webp/);
  assert.match(page,/Return to FinalForge/);
  assert.match(page,/100dvh/);
});
