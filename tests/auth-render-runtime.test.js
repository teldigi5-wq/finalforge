import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/auth.js', import.meta.url), 'utf8');
const escSource = source.match(/function escapeUserHtml\(value\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(escSource, 'Expected the reviewed output-encoding helper');
const escapeUserHtml = new Function(`${escSource}; return escapeUserHtml;`)();

test('actual account-menu renderer keeps student identity out of its HTML template', () => {
  const start = source.indexOf('function showApp(');
  const end = source.indexOf('\n  function ensureAdminNav', start);
  assert.ok(start >= 0 && end > start, 'Expected complete account renderer');

  const menu = {
    markup: '',
    headerName: {textContent: ''},
    headerEmail: {textContent: ''},
    set innerHTML(value) { this.markup = value; },
    querySelector(selector) {
      if (selector === '.account-menu-head') {
        return { querySelector: name => name === '[data-account-primary]' ?
          this.headerName : name === '[data-account-secondary]' ? this.headerEmail : null };
      }
      return null;
    },
  };
  const cells = new Map([
    ['#accountPrimary', {textContent: ''}],
    ['#accountSecondary', {textContent: ''}],
    ['#accountChip .account-avatar', {textContent: ''}],
    ['#accountMenuBody', menu]
  ]);
  const $ = name => cells.get(name) ?? null;
  const doc = {body:{classList:{remove() {}}}};
  const win = {scrollTo() {}};
  const factory = new Function('document','window','$','gate','ensureAdminNav','setTimeout',
    `let currentProfile = null; ${source.slice(start,end)}; return showApp;`);
  const showApp = factory(doc,win,$,null,()=>{},()=>{throw Error('Unexpected motion timeout');});
  const hostileId = '<img src=x onerror=alert(1)>';
  const hostileEmail = '<svg onload=alert(2)>@my.sliit.lk';

  showApp({role:'student',studentId:hostileId,sliitEmail:hostileEmail},{email:hostileEmail});
  assert.equal(cells.get('#accountPrimary').textContent,hostileId);
  assert.equal(cells.get('#accountSecondary').textContent,hostileEmail);
  assert.equal(menu.headerName.textContent,hostileId);
  assert.equal(menu.headerEmail.textContent,hostileEmail);
  assert.ok(!menu.markup.includes(hostileId),'Identity must never enter innerHTML');
  assert.ok(!menu.markup.includes(hostileEmail),'Email must never enter innerHTML');
  assert.ok(menu.markup.includes('data-account-primary'));
});

test('real admin table renderer HTML-encodes Firestore student identity fields', () => {
  const start=source.indexOf('function renderAdminRows(){');
  const end=source.indexOf("\n  $('#adminSearch')",start);
  assert.ok(start >= 0 && end > start, 'Expected complete admin table renderer');
  const table={innerHTML:''};
  const $=selector=>selector==='#adminSearch'?{value:''}:selector==='#adminUsersBody'?table:null;
  const id='<img src=x onerror=alert(1)>';
  const email='<svg onload=alert(2)>@my.sliit.lk';
  const adminCache=[{studentId:id,sliitEmail:email,emailVerified:true,lastLoginAt:null}];
  const render = new Function('adminCache','$','escapeUserHtml','fmtDate',
    `${source.slice(start,end)}; return renderAdminRows;`)(adminCache,$,escapeUserHtml,()=>'—');
  render();
  assert.ok(table.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(table.innerHTML.includes('&lt;svg onload=alert(2)&gt;'));
  assert.ok(!table.innerHTML.includes('<img'));
  assert.ok(!table.innerHTML.includes('<svg'));
});
