import test from 'node:test';
import assert from 'node:assert/strict';
import { registerStudent } from '../api/signup.js';

const STUDENT_ID='IT26111111';
const SLIIT_EMAIL='it26111111@my.sliit.lk';
const PASSWORD='test-password-123';

function request(overrides={}){
  return {studentId:STUDENT_ID,sliitEmail:SLIIT_EMAIL,password:PASSWORD,ip:'test',...overrides};
}

function backend(approved, { active = true, claimed = false, allowlistEmail } = {}) {
  const created = [];
  const db = {
    runTransaction: async fn => fn({ get: async () => ({ data: () => null }), set: () => {} }),
    collection: name => ({ doc: id => ({
      get: async () => name === 'student_allowlist'
        ? { exists: approved, data: () => ({ active, sliitEmail: allowlistEmail || `${id.toLowerCase()}@my.sliit.lk` }) }
        : { exists: claimed },
    }) }),
  };
  const auth = { createUser: async record => { created.push(record); return { uid: 'test' }; } };
  return { db, auth, created };
}

test('unapproved Student ID cannot create an Auth account', async () => {
  const deps = backend(false);
  const result = await registerStudent(request(), deps);
  assert.equal(result.status, 403);
  assert.equal(deps.created.length, 0);
});

test('approved ID is created with the validated SLIIT address and unverified email', async () => {
  const deps = backend(true);
  const result = await registerStudent(request({
    studentId: 'it26111111',
    email: 'attacker@example.com',
  }), deps);
  assert.equal(result.status, 201);
  assert.equal(deps.created[0].email, SLIIT_EMAIL);
  assert.equal(deps.created[0].emailVerified, false);
});

test('malformed ID, weak password, and mismatched SLIIT email never call the Auth API', async () => {
  const deps = backend(true);
  assert.equal((await registerStudent(request({ studentId: 'X123', sliitEmail: 'x123@my.sliit.lk' }), deps)).status, 400);
  assert.equal((await registerStudent(request({ password: 'short' }), deps)).status, 400);
  assert.equal((await registerStudent(request({ sliitEmail: 'attacker@example.com' }), deps)).status, 400);
  assert.equal(deps.created.length, 0);
});

test('inactive and mismatched allowlist entries cannot create accounts', async () => {
  for (const options of [{ active: false }, { allowlistEmail: 'another@my.sliit.lk' }]) {
    const deps = backend(true, options);
    const result = await registerStudent(request(), deps);
    assert.equal(result.status, 403);
    assert.equal(deps.created.length, 0);
  }
});

test('an already claimed Student ID cannot create another account', async () => {
  const deps = backend(true, { claimed: true });
  const result = await registerStudent(request(), deps);
  assert.equal(result.status, 409);
  assert.equal(deps.created.length, 0);
});
