import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../.github/workflows/signup-security.yml',import.meta.url),'utf8');

test('signup security workflow pins third-party actions to reviewed commits',()=>{
  assert.match(source,/actions\\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/);
  assert.match(source,/actions\\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.doesNotMatch(source,/uses:\\s+actions\\\/[a-z-]+@v[0-9]+(?:\\s|$)/m);
});

test('signup security CI remains read-only, does not persist checkout credentials and tests authorization',()=>{
  assert.match(source,/permissions:\\s*\\n\\s+contents: read/);
  assert.match(source,/persist-credentials: false/);
  for(const command of [
    'npm ci --ignore-scripts',
    'npm run check:security',
    'npm run test:security',
    'tests/firestore-rules-policy.test.js',
    'tests/auth-dom-safety.test.js',
    'tests/admin-table-safety.test.js',
  ]) assert.ok(source.includes(command), command);
  assert.doesNotMatch(source,/\\bcontents: write\\b/);
});
