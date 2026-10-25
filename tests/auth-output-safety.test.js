import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/auth.js', import.meta.url), 'utf8');
const helper = source.match(/function escapeUserHtml\(value\) \{[\s\S]*?\n  \}/)?.[0];
test('HTML-safe user text escapes all dangerous interpolation characters', () => {
  assert.ok(helper, 'Expected reviewed helper');
  const escapeUserHtml = new Function(`${helper};return escapeUserHtml;`)();
  assert.equal(escapeUserHtml(`<img src=x onerror='alert(1)'>&"`),
    '&lt;img src=x onerror=&#39;alert(1)&#39;&gt;&amp;&quot;');
});
test('account menu displays identity as text, not HTML', () => {
  assert.ok(!source.includes('<b>${primary}</b><span>${secondary}</span>'));
  assert.ok(source.includes('nameNode.textContent = primary'));
  assert.ok(source.includes('emailNode.textContent = secondary'));
});
test('admin table and error messages cannot inject HTML', () => {
  assert.ok(source.includes("escapeUserHtml(x.studentId||'—')"));
  assert.ok(source.includes("escapeUserHtml(x.sliitEmail||'—')"));
  assert.ok(source.includes('escapeUserHtml(humanError(e))'));
});
