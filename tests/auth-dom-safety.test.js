import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/auth.js', import.meta.url), 'utf8');
test('account menu treats account identity as text, never executable markup', () => {
  assert.ok(!source.includes('<b>${primary}</b><span>${secondary}</span>'));
  assert.ok(source.includes('<b data-account-primary></b><span data-account-secondary></span>'));
  assert.match(source, /nameNode\.textContent\s*=\s*primary/);
  assert.match(source, /emailNode\.textContent\s*=\s*secondary/);
  assert.match(source, /\$\('#accountMenuBody'\)\.innerHTML=preview/);
});
