import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Firebase end-user account creation must remain disabled in Authentication
// settings so direct browser SDK calls cannot bypass this allowlist check.
function services() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FinalForge server credential is not configured');
  if (!getApps().length) {
    const account = JSON.parse(raw);
    if (account.type !== 'service_account' || account.project_id !== 'finalforge-dd1cf' ||
        !/^finalforge-signup@finalforge-dd1cf\.iam\.gserviceaccount\.com$/.test(account.client_email || '')) {
      throw new Error('Unexpected FinalForge service account');
    }
    initializeApp({ credential: cert(account), projectId: 'finalforge-dd1cf' });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export async function registerStudent({ studentId, password, ip }, { auth, db }) {
  const id = String(studentId || '').trim().toUpperCase();
  if (!/^IT\d{8}$/.test(id) || typeof password !== 'string' || password.length < 8 || password.length > 128)
    return { status: 400, message: 'Invalid Student ID or password.' };
  const email = `${id.toLowerCase()}@my.sliit.lk`;
  const digest = createHash('sha256').update(`${process.env.SIGNUP_RATE_SECRET || ''}:${ip}`).digest('hex');
  const rateRef = db.collection('signup_rate').doc(digest);
  const now = Date.now();
  const allowed = await db.runTransaction(async tx => {
    const doc = await tx.get(rateRef);
    const prior = doc.data();
    const count = prior && prior.windowStart > now - 3600000 ? prior.count : 0;
    if (count >= 10) return false;
    tx.set(rateRef, { count: count + 1, windowStart: count ? prior.windowStart : now, expiresAt: new Date(now + 86400000) });
    return true;
  });
  if (!allowed) return { status: 429, message: 'Too many attempts. Try again later.' };
  const approved = await db.collection('student_allowlist').doc(id).get();
  if (!approved.exists || approved.data().active !== true || approved.data().sliitEmail !== email)
    return { status: 403, message: 'Student ID is not eligible for registration.' };
  const claimed = await db.collection('student_claims').doc(id).get();
  if (claimed.exists) return { status: 409, message: 'Account already registered. Sign in or reset the password.' };
  try {
    await auth.createUser({ email, password, emailVerified: false, displayName: id });
    // Social-proof telemetry is aggregate only. Never block signup if this cosmetic counter fails.
    try {
      await db.collection('platform_stats').doc('public').set({
        registered: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } catch {}
    return { status: 201, message: 'Account created. Verify the SLIIT email before accessing FinalForge.' };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') return { status: 409, message: 'Account already registered. Sign in or reset the password.' };
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (req.headers.origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Invalid origin.' });
  if (Number(req.headers['content-length'] || 0) > 2048) return res.status(413).json({ error: 'Request too large.' });
  try {
    if (!process.env.SIGNUP_RATE_SECRET) throw new Error('Signup rate limit is not configured');
    const { studentId, password } = req.body || {};
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0];
    const result = await registerStudent({ studentId, password, ip }, services());
    return res.status(result.status).json(result.status === 201 ? { message: result.message } : { error: result.message });
  } catch {
    return res.status(503).json({ error: 'Signup is temporarily unavailable.' });
  }
}
