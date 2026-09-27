import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const student = fs.readFileSync(new URL('../assets/student-experience-v2.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../assets/resource-delivery-v1.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const endpoint = fs.readFileSync(new URL('../api/resource-url.js', import.meta.url), 'utf8');

test('all client resource-opening bypasses route through finalforgeOpenResource', () => {
  assert.doesNotMatch(app, /href=["'`]\$\{encodeURI\(r\.path\)\}/);
  assert.doesNotMatch(student, /window\.open\(encodeURI\(r\.path\)/);
  assert.doesNotMatch(student, /window\.open\(['"]official\/Y1S1_Final_Exam_Timetable/);
  assert.match(app, /finalforgeOpenResource/);
  assert.match(student, /finalforgeOpenResource/);
  assert.match(client, /\/api\/resource-url/);
});

test('client derives stable IDs without shipping a raw path-to-ID map', () => {
  assert.match(client, /finalforgeResourceIdForPath:resourceIdForPath/);
  assert.match(client, /FNV_OFFSET=0xcbf29ce484222325n/);
  assert.match(client, /padStart\(16,'0'\)/);
  assert.doesNotMatch(client, /"resources\/[^"]+":"ffr1_/);
  assert.match(client, /official-timetable-v3-2026-09-15/);
});

test('signed URLs and auth tokens are not persisted by the client runtime', () => {
  assert.doesNotMatch(client, /localStorage\.setItem|sessionStorage\.setItem|firebase\.firestore/);
  assert.match(client, /cache:'no-store'/);
});

test('service worker bypasses protected routes and refuses private/no-store caching', () => {
  assert.match(sw, /startsWith\('\/api\/'\)/);
  assert.match(sw, /startsWith\('\/resource\/'\)/);
  assert.match(sw, /no-store\|private/i);
});

test('server-side signing secret never appears in browser runtime', () => {
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET|sb_secret_|service_role/i);
  assert.match(endpoint, /FINALFORGE_SUPABASE_SECRET_KEY/);
  assert.match(endpoint, /'apikey': secret/);
  assert.doesNotMatch(endpoint, /'Authorization': `Bearer \${secret}`/);
  assert.match(endpoint, /verifyIdToken\(token, true\)/);
});
