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
    && profile?.disabled === false
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

export function createResourceUrlHandler({ verifyIdToken, loadStudentEntitlement, getResourceById, signResource }) {
  if (![verifyIdToken, loadStudentEntitlement, getResourceById, signResource].every(fn => typeof fn === 'function')) {
    throw new TypeError('Resource handler dependencies are incomplete');
  }

  return async function resourceUrlHandler(req, res) {
    setPrivateHeaders(res);

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

    const expectedOrigin = `https://${header(req, 'host') || ''}`;
    if (header(req, 'origin') !== expectedOrigin) return res.status(403).json({ error: 'Invalid origin.' });

    const contentLength = Number(header(req, 'content-length') || 0);
    if (contentLength > MAX_BODY_BYTES || bodySize(req.body) > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Request too large.' });
    }

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const fields = Object.keys(body);
    if (fields.some(key => key !== 'resourceId')) return res.status(400).json({ error: 'Unsupported request fields.' });

    const resourceId = String(body.resourceId || '').trim();
    if (!RESOURCE_ID_RE.test(resourceId)) return res.status(400).json({ error: 'Invalid resource ID.' });

    const token = tokenFromAuthorization(header(req, 'authorization'));
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    let decoded;
    try {
      decoded = await verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let entitlement = null;
    if (decoded?.admin !== true) {
      try { entitlement = await loadStudentEntitlement(decoded); }
      catch { return res.status(503).json({ error: 'Resource authorization is temporarily unavailable.' }); }
    }
    if (!isAuthorizedResourceUser(decoded, entitlement)) return res.status(403).json({ error: 'Resource access denied.' });

    const resource = getResourceById(resourceId);
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });

    try {
      const signed = await signResource(resource.storagePath);
      if (!signed || typeof signed.url !== 'string' || !signed.url.startsWith('https://')) throw new Error('Invalid signed URL');
      return res.status(200).json({ url: signed.url, expiresIn: signed.expiresIn });
    } catch {
      return res.status(503).json({ error: 'Resource is temporarily unavailable.' });
    }
  };
}
