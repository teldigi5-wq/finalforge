import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createResourceUrlHandler, isAuthorizedResourceUser, tokenFromAuthorization } from '../api/_resource-url-core.js';

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; }
  };
}

function req(body = { resourceId: 'ffr1_0123456789abcdef' }, extra = {}) {
  const { headers: extraHeaders = {}, ...rest } = extra;
  return {
    method: 'POST',
    headers: {
      host: 'finalforge-weld.vercel.app',
      origin: 'https://finalforge-weld.vercel.app',
      authorization: 'Bearer valid-token',
      'content-length': '64',
      ...extraHeaders
    },
    body,
    ...rest
  };
}

const student = { uid: 'uid-a', email: 'it26123456@my.sliit.lk', email_verified: true };
const entitlement = {
  profile: { studentId: 'IT26123456', sliitEmail: student.email, role: 'student', disabled: false, emailVerified: true },
  allowlist: { active: true, sliitEmail: student.email },
  claim: { studentId: 'IT26123456', uid: student.uid }
};

function deps(overrides = {}) {
  return {
    verifyIdToken: async () => student,
    loadStudentEntitlement: async () => entitlement,
    getResourceById: id => id === 'ffr1_0123456789abcdef' ? { id, storagePath: 'resources/dcn/example.pdf' } : null,
    signResource: async path => ({ url: `https://project.supabase.co/storage/v1/object/sign/private/${encodeURIComponent(path)}?token=signed`, expiresIn: 90 }),
    ...overrides
  };
}

test('Bearer parser is strict', () => {
  assert.equal(tokenFromAuthorization('Bearer abc.def'), 'abc.def');
  assert.equal(tokenFromAuthorization('Basic abc'), '');
  assert.equal(tokenFromAuthorization('Bearer a b'), '');
});

test('student authorization mirrors verified profile/allowlist/claim boundary', () => {
  assert.equal(isAuthorizedResourceUser(student, entitlement), true);
  assert.equal(isAuthorizedResourceUser({ ...student, email_verified: false }, entitlement), false);
  assert.equal(isAuthorizedResourceUser(student, { ...entitlement, profile: { ...entitlement.profile, disabled: true } }), false);
  assert.equal(isAuthorizedResourceUser(student, { ...entitlement, allowlist: { ...entitlement.allowlist, active: false } }), false);
  assert.equal(isAuthorizedResourceUser(student, { ...entitlement, claim: { ...entitlement.claim, uid: 'uid-b' } }), false);
});

test('legacy verified student profiles without disabled field remain active unless explicitly disabled', () => {
  const legacyProfile = { ...entitlement.profile };
  delete legacyProfile.disabled;
  assert.equal(isAuthorizedResourceUser(student, { ...entitlement, profile: legacyProfile }), true);
  assert.equal(isAuthorizedResourceUser(student, { ...entitlement, profile: { ...legacyProfile, disabled: true } }), false);
});

test('admin authorization requires verified Firebase email plus admin:true', () => {
  assert.equal(isAuthorizedResourceUser({ uid: 'admin', email: 'admin@my.sliit.lk', email_verified: true, admin: true }, null), true);
  assert.equal(isAuthorizedResourceUser({ uid: 'admin', email: 'admin@my.sliit.lk', email_verified: false, admin: true }, null), false);
});

test('handler returns only short-lived signed URL and private no-store headers', async () => {
  let signedPath = '';
  const handler = createResourceUrlHandler(deps({ signResource: async path => { signedPath = path; return { url: 'https://project.supabase.co/storage/v1/object/sign/finalforge-resources/file.pdf?token=x', expiresIn: 90 }; } }));
  const res = responseRecorder();
  await handler(req(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { url: 'https://project.supabase.co/storage/v1/object/sign/finalforge-resources/file.pdf?token=x', expiresIn: 90 });
  assert.equal(signedPath, 'resources/dcn/example.pdf');
  assert.match(res.headers['Cache-Control'], /no-store/);
  assert.match(res.headers['Cache-Control'], /private/);
  assert.equal(JSON.stringify(res.payload).includes('resources/dcn/example.pdf'), false);
});

test('browser-supplied raw storage path is rejected even with a valid resource ID', async () => {
  let signed = false;
  const handler = createResourceUrlHandler(deps({ signResource: async () => { signed = true; return { url: 'https://project.supabase.co/x', expiresIn: 90 }; } }));
  const res = responseRecorder();
  await handler(req({ resourceId: 'ffr1_0123456789abcdef', path: 'resources/dcn/attacker.pdf' }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'INVALID_REQUEST');
  assert.equal(signed, false);
});

test('resource existence is not disclosed before authentication and authorization', async () => {
  let lookedUp = false;
  const getResourceById = () => { lookedUp = true; return null; };

  const missingAuth = responseRecorder();
  const handler = createResourceUrlHandler(deps({ getResourceById }));
  await handler(req({ resourceId: 'ffr1_ffffffffffffffff' }, { headers: { authorization: '' } }), missingAuth);
  assert.equal(missingAuth.statusCode, 401);
  assert.equal(missingAuth.payload.code, 'AUTH_REQUIRED');
  assert.equal(lookedUp, false);

  const denied = responseRecorder();
  const deniedHandler = createResourceUrlHandler(deps({
    getResourceById,
    loadStudentEntitlement: async () => ({ ...entitlement, allowlist: { ...entitlement.allowlist, active: false } })
  }));
  await deniedHandler(req({ resourceId: 'ffr1_ffffffffffffffff' }), denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.payload.code, 'ACCESS_DENIED');
  assert.equal(lookedUp, false);
});

test('unknown stable resource IDs never reach storage signing', async () => {
  let signed = false;
  const handler = createResourceUrlHandler(deps({ signResource: async () => { signed = true; return { url: 'https://project.supabase.co/x', expiresIn: 90 }; } }));
  const res = responseRecorder();
  await handler(req({ resourceId: 'ffr1_ffffffffffffffff' }), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'RESOURCE_NOT_FOUND');
  assert.equal(signed, false);
});

test('missing/revoked token fails closed', async () => {
  const missing = responseRecorder();
  const handler = createResourceUrlHandler(deps());
  await handler(req(undefined, { headers: { authorization: '' } }), missing);
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.payload.code, 'AUTH_REQUIRED');

  const revoked = responseRecorder();
  const revokedHandler = createResourceUrlHandler(deps({ verifyIdToken: async () => { throw Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' }); } }));
  await revokedHandler(req(), revoked);
  assert.equal(revoked.statusCode, 401);
  assert.equal(revoked.payload.code, 'AUTH_REQUIRED');
});

test('verification infrastructure failures are not misreported as a bad user session', async () => {
  const unavailable = responseRecorder();
  const handler = createResourceUrlHandler(deps({ verifyIdToken: async () => { throw Object.assign(new Error('permission denied'), { code: 'auth/insufficient-permission' }); } }));
  await handler(req(), unavailable);
  assert.equal(unavailable.statusCode, 503);
  assert.deepEqual(unavailable.payload, { error: 'Authentication verification is temporarily unavailable.', code: 'AUTH_VERIFY_UNAVAILABLE' });
});

test('storage failure returns a safe categorized error without paths', async () => {
  const handler = createResourceUrlHandler(deps({ signResource: async () => { throw new Error('private storage detail'); } }));
  const res = responseRecorder();
  await handler(req(), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.payload, { error: 'Resource is temporarily unavailable.', code: 'STORAGE_UNAVAILABLE' });
  assert.equal(JSON.stringify(res.payload).includes('resources/'), false);
});

test('origin mismatch and unsupported methods fail before authorization', async () => {
  let verified = false;
  const handler = createResourceUrlHandler(deps({ verifyIdToken: async () => { verified = true; return student; } }));
  const badOrigin = responseRecorder();
  await handler(req(undefined, { headers: { origin: 'https://evil.example' } }), badOrigin);
  assert.equal(badOrigin.statusCode, 403);
  assert.equal(badOrigin.payload.code, 'INVALID_ORIGIN');
  assert.equal(verified, false);

  const method = responseRecorder();
  await handler({ ...req(), method: 'GET' }, method);
  assert.equal(method.statusCode, 405);
  assert.equal(method.payload.code, 'METHOD_NOT_ALLOWED');
});

const client = fs.readFileSync(new URL('../assets/resource-delivery-v1.js', import.meta.url), 'utf8');
const openingPage = fs.readFileSync(new URL('../resource-opening.html', import.meta.url), 'utf8');

test('resource client uses a same-origin opening page instead of about:blank', () => {
  assert.match(client, /OPENING_PAGE='\/resource-opening\.html'/);
  assert.doesNotMatch(client, /window\.open\('about:blank'/);
  assert.match(client, /STORAGE_ORIGIN='https:\/\/jzgpwmxwekkbxdkhtsai\.supabase\.co'/);
  assert.match(client, /getIdToken\(forceRefresh\)/);
  assert.match(client, /user\.reload\(\)/);
  assert.match(openingPage, /Opening secure resource/);
  assert.match(openingPage, /Return to FinalForge/);
  assert.match(openingPage, /Private resource delivery/);
});
