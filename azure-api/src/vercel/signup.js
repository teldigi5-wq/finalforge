import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const REGISTRATION_WINDOW_MS = 20 * 60 * 1000;

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

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function classifyExistingAccount({ auth, db, id, email, now }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }

  const [profile, claim, pending] = await Promise.all([
    db.collection('profiles').doc(user.uid).get(),
    db.collection('student_claims').doc(id).get(),
    db.collection('pending_registrations').doc(user.uid).get()
  ]);

  if (profile.exists || claim.exists || user.emailVerified) {
    return {
      status: 409,
      message: 'Account already exists. Sign in or use password recovery.',
      registration: profile.exists || claim.exists ? 'active' : 'verified'
    };
  }

  const expiresAt = timestampMillis(pending.data()?.expiresAt);
  if (pending.exists && expiresAt > now) {
    return {
      status: 409,
      message: 'Registration is already waiting for SLIIT email verification.',
      registration: 'pending',
      expiresAt
    };
  }

  return {
    status: 409,
    message: 'The previous verification window expired. Sign in with the same password to restart verification.',
    registration: pending.exists ? 'expired' : 'legacy',
    expiresAt
  };
}

export async function registerStudent({ studentId, password, ip }, { auth, db }) {
  const id = String(studentId || '').trim().toUpperCase();
  const email = /^IT\d{8}$/.test(id) ? `${id.toLowerCase()}@my.sliit.lk` : '';

  if (!/^IT\d{8}$/.test(id) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { status: 400, message: 'Invalid Student ID or password.' };
  }

  const digest = createHash('sha256').update(`${process.env.SIGNUP_RATE_SECRET || ''}:${ip}`).digest('hex');
  const rateRef = db.collection('signup_rate').doc(digest);
  const now = Date.now();
  const allowed = await db.runTransaction(async tx => {
    const doc = await tx.get(rateRef);
    const prior = doc.data();
    const count = prior && prior.windowStart > now - 3600000 ? prior.count : 0;
    if (count >= 10) return false;
    tx.set(rateRef, {
      count: count + 1,
      windowStart: count ? prior.windowStart : now,
      expiresAt: new Date(now + 86400000)
    });
    return true;
  });
  if (!allowed) return { status: 429, message: 'Too many attempts. Try again later.' };

  const approved = await db.collection('student_allowlist').doc(id).get();
  const approvedEmail = String(approved.data()?.sliitEmail || '').trim().toLowerCase();
  if (!approved.exists || approved.data().active !== true || approvedEmail !== email) {
    return { status: 403, message: 'Student ID is not eligible for FinalForge registration.' };
  }

  const claimed = await db.collection('student_claims').doc(id).get();
  if (claimed.exists) {
    return { status: 409, message: 'Account already registered. Sign in or reset the password.', registration: 'active' };
  }

  const existing = await classifyExistingAccount({ auth, db, id, email, now });
  if (existing) return existing;

  try {
    const user = await auth.createUser({ email, password, emailVerified: false, displayName: id });
    const expiresAt = now + REGISTRATION_WINDOW_MS;
    await db.collection('pending_registrations').doc(user.uid).set({
      studentId: id,
      sliitEmail: email,
      status: 'pending',
      createdAt: new Date(now),
      expiresAt: new Date(expiresAt)
    });
    return {
      status: 201,
      message: 'Account created. Verify your SLIIT email within 20 minutes to activate FinalForge.',
      registration: 'pending',
      email,
      expiresAt
    };
  } catch (error) {
    if (error?.code === 'auth/email-already-exists') {
      return await classifyExistingAccount({ auth, db, id, email, now }) || {
        status: 409,
        message: 'Account already exists. Sign in or use password recovery.',
        registration: 'active'
      };
    }
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (req.headers.origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Invalid origin.' });
  if (Number(req.headers['content-length'] || 0) > 1536) return res.status(413).json({ error: 'Request too large.' });

  try {
    if (!process.env.SIGNUP_RATE_SECRET) throw new Error('Signup rate limit is not configured');
    const body = req.body || {};
    const keys = Object.keys(body);
    if (keys.some(key => !['studentId', 'password'].includes(key))) {
      return res.status(400).json({ error: 'Unexpected signup fields.' });
    }
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0];
    const result = await registerStudent({ studentId: body.studentId, password: body.password, ip }, services());
    const payload = result.status === 201 ? { message: result.message } : { error: result.message };
    if (result.registration) payload.registration = result.registration;
    if (result.email) payload.email = result.email;
    if (result.expiresAt) payload.expiresAt = result.expiresAt;
    return res.status(result.status).json(payload);
  } catch {
    return res.status(503).json({ error: 'Signup is temporarily unavailable.' });
  }
}
