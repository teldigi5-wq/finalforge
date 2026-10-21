import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../assets/auth.js', import.meta.url),'utf8');
test('stored student profile fields are escaped before admin HTML templating',()=>{
  const helper = source.match(/function escapeUserHtml\(value\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(helper);
  const escapeUserHtml = new Function(`${helper};return escapeUserHtml;`)();
  assert.equal(escapeUserHtml(`<script>onload='x'&"</script>`),
    '&lt;script&gt;onload=&#39;x&#39;&amp;&quot;&lt;/script&gt;');
  assert.ok(source.includes("escapeUserHtml(x.studentId||'—')"));
  assert.ok(source.includes("escapeUserHtml(x.sliitEmail||'—')"));
  assert.ok(!source.includes("<b>${x.studentId||'—'}</b>"));
});

test('admin dashboard escapes provider errors before inserting into HTML',()=>{
  assert.ok(source.includes('escapeUserHtml(humanError(e))'));
  assert.ok(!source.includes('${humanError(e)}</td></tr>'));
  const helper = source.match(/function escapeUserHtml\\(value\\) \\{[\\s\\S]*?\\n  \\}/)?.[0];
  assert.ok(helper);
  const escape = new Function(`${helper};return escapeUserHtml;`)();
  const untrusted = '<img src=x onerror=alert(1)>';
  const safe = escape(untrusted);
  assert.equal(safe, '&lt;img src=x onerror=alert(1)&gt;');
  assert.ok(!safe.includes('<img'));
});
