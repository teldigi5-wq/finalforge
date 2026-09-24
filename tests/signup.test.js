import test from 'node:test';
import assert from 'node:assert/strict';
import { registerStudent } from '../api/signup.js';

function backend(approved) {
  const created = [];
  const db = {
    runTransaction: async fn => fn({ get: async () => ({ data: () => null }), set: () => {} }),
    collection: name => ({ doc: id => ({
      get: async () => name === 'student_allowlist'
        ? { exists: approved, data: () => ({ active: true, sliitEmail: `${id.toLowerCase()}@my.sliit.lk` }) }
        : { exists: false },
    }) }),
  };
  const auth = { createUser: async record => { created.push(record); return { uid: 'test' }; } };
  return { db, auth, created };
}

test('unapproved Student ID cannot create an Auth account', async () => {
  const deps = backend(false);
  const result = await registerStudent({ studentId: 'IT26101524', password: 'test-password-123', ip: 'test' }, deps);
  assert.equal(result.status, 403);
  assert.equal(deps.created.length, 0);
});

test('approved ID is created with derived address and unverified email', async () => {
  const deps = backend(true);
  const result = await registerStudent({ studentId: 'it26101524', password: 'test-password-123', email: 'attacker@example.com', ip: 'test' }, deps);
  assert.equal(result.status, 201);
  assert.equal(deps.created[0].email, 'it26101524@my.sliit.lk');
  assert.equal(deps.created[0].emailVerified, false);
});

test('malformed ID and weak password never call the Auth API', async () => {
  const deps = backend(true);
  assert.equal((await registerStudent({ studentId: 'X123', password: 'test-password-123', ip: 'test' }, deps)).status, 400);
  assert.equal((await registerStudent({ studentId: 'IT26101524', password: 'short', ip: 'test' }, deps)).status, 400);
  assert.equal(deps.created.length, 0);
});
