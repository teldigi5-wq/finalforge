import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../.github/workflows/signup-security.yml',import.meta.url),'utf8');

test('signup security workflow pins third-party actions to reviewed commits',()=>{
  assert.ok(source.includes('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683'));
  assert.ok(source.includes('actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'));
  assert.ok(!source.includes('actions/checkout@v4'));
  assert.ok(!source.includes('actions/setup-node@v4'));
});

test('signup security CI remains read-only and tests authentication boundaries',()=>{
  assert.ok(source.includes('contents: read'));
  assert.ok(source.includes('persist-credentials: false'));
  for(const command of [
    'npm ci --ignore-scripts',
    'npm run check:security',
    'npm run test:security',
    'tests/firestore-rules-policy.test.js',
    'tests/auth-dom-safety.test.js',
    'tests/admin-table-safety.test.js',
  ]) assert.ok(source.includes(command),command);
  assert.ok(!source.includes('contents: write'));
});
