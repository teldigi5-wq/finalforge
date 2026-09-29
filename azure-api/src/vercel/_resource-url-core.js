const MAX_BODY_BYTES = 2048;
const RESOURCE_ID_RE = /^(?:ffr1_[0-9a-f]{16}|official-timetable-v3-2026-09-15)$/;

function header(req, name) {
  const value = req?.headers?.[name] ?? req?.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function tokenFromAuthorization(value) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(value || '').trim());
  return match?.[1] || '';
}

export function isAuthorizedResourceUser(decoded, entitlement) {
  if (!decoded || decoded.email_verified !== true) return false;
  const email = normalizeEmail(decoded.email);
  if (!email || !decoded.uid) return false;

  if (decoded.admin === true) return true;

  const profile = entitlement?.profile;
  const allowlist = entitlement?.allowlist;
  const claim = entitlement?.claim;
  const studentId = String(profile?.studentId || '').trim().toUpperCase();

  return /^IT\d{8}$/.test(studentId)
    && profile?.role === 'student'
    // Legacy verified profiles may predate the disabled field. Only an explicit
    // disabled=true is disabled; this matches the canonical auth runtime.
    && profile?.disabled !== true
    && profile?.emailVerified === true
    && normalizeEmail(profile?.sliitEmail) === email
    && allowlist?.active === true
    && normalizeEmail(allowlist?.sliitEmail) === email
    && claim?.uid === decoded.uid
    && String(claim?.studentId || studentId).trim().toUpperCase() === studentId;
}

function setPrivateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function bodySize(body) {
  try { return Buffer.byteLength(JSON.stringify(body ?? {}), 'utf8'); }
  catch { return MAX_BODY_BYTES + 1; }
}

function error(res, status, message, code) {
  return res.status(status).json({ error: message, code });
}

export function createResourceUrlHandler({ verifyIdToken, loadStudentEntitlement, getResourceById, signResource }) {
  if (![verifyIdToken, loadStudentEntitlement, getResourceById, signResource].every(fn => typeof fn === 'function')) {
    throw new TypeError('Resource handler dependencies are incomplete');
  }

  return async function resourceUrlHandler(req, res) {
    setPrivateHeaders(res);

    if (req.method !== 'POST') return error(res, 405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');

    const expectedOrigin = `https://${header(req, 'host') || ''}`;
    if (header(req, 'origin') !== expectedOrigin) return error(res, 403, 'Invalid origin.', 'INVALID_ORIGIN');

    const contentLength = Number(header(req, 'content-length') || 0);
    if (contentLength > MAX_BODY_BYTES || bodySize(req.body) > MAX_BODY_BYTES) {
      return error(res, 413, 'Request too large.', 'REQUEST_TOO_LARGE');
    }

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const fields = Object.keys(body);
    if (fields.some(key => key !== 'resourceId')) return error(res, 400, 'Unsupported request fields.', 'INVALID_REQUEST');

    const resourceId = String(body.resourceId || '').trim();
    if (!RESOURCE_ID_RE.test(resourceId)) return error(res, 400, 'Invalid resource ID.', 'INVALID_RESOURCE_ID');

    const token = tokenFromAuthorization(header(req, 'authorization'));
    if (!token) return error(res, 401, 'Authentication required.', 'AUTH_REQUIRED');

    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return error(res, 401, 'Authentication required.', 'AUTH_REQUIRED');
    }

    let entitlement = null;
    if (decoded?.admin !== true) {
      try { entitlement = await loadStudentEntitlement(decoded); }
      catch { return error(res, 503, 'Resource authorization is temporarily unavailable.', 'AUTHZ_UNAVAILABLE'); }
    }
    if (!isAuthorizedResourceUser(decoded, entitlement)) return error(res, 403, 'Resource access denied.', 'ACCESS_DENIED');

    const resource = getResourceById(resourceId);
    if (!resource) return error(res, 404, 'Resource not found.', 'RESOURCE_NOT_FOUND');

    try {
      const signed = await signResource(resource.storagePath);
      if (!signed || typeof signed.url !== 'string' || !signed.url.startsWith('https://')) throw new Error('Invalid signed URL');
      return res.status(200).json({ url: signed.url, expiresIn: signed.expiresIn });
    } catch {
      return error(res, 503, 'Resource is temporarily unavailable.', 'STORAGE_UNAVAILABLE');
    }
  };
}
