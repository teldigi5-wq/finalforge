import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firebase/firestore.rules', import.meta.url), 'utf8');

test('student progress needs an active verified, allowlisted, claimed identity', () => {
  assert.match(rules, /function approvedStudent\(uid\)/);
  for (const requirement of [
    'verifiedEmail() && own(uid)',
    "profile.role == 'student'",
    'profile.disabled == false',
    'profile.sliitEmail == request.auth.token.email',
    'get(/databases/$(database)/documents/student_allowlist/$(studentId)).data.active == true',
    'get(/databases/$(database)/documents/student_claims/$(studentId)).data.uid == uid',
    'allow read, write: if isAdmin() || approvedStudent(uid);',
  ]) assert.ok(rules.includes(requirement), 'Missing: ' + requirement);
});

test('self-service profile updates cannot promote roles, change identity, or un-disable accounts', () => {
  assert.match(rules, /match \/profiles\/\{uid\}/);
  assert.ok(rules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLoginAt'])"));
  assert.ok(rules.includes('request.resource.data.role == resource.data.role'));
  assert.ok(rules.includes('request.resource.data.disabled == resource.data.disabled'));
  assert.ok(rules.includes('allow delete: if isAdmin();'));
});

test('student allowlist is not readable by regular clients; claims are not user-deletable', () => {
  assert.match(rules, /match \/student_allowlist\/\{studentId\} \{\s*allow read, write: if isAdmin\(\);/);
  assert.match(rules, /match \/student_claims\/\{studentId\}/);
  assert.ok(rules.includes('allow delete: if isAdmin();'));
});
