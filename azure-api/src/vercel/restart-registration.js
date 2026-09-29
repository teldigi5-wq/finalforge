import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

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

function readToken(req) {
  const direct = String(req.headers['x-finalforge-token'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = direct || bearer;
  return token && token.length <= 8192 ? token : '';
}

function identityFromDecoded(decoded) {
  const email = String(decoded?.email || '').trim().toLowerCase();
  const match = /^it(\d{8})@my\.sliit\.lk$/.exec(email);
  if (!match) return null;
  return { email, studentId: `IT${match[1]}` };
}

export async function restartRegistration(decoded, { db }) {
  if (decoded?.admin === true) throw Object.assign(new Error('Student registration is required.'), { code: 'forbidden' });
  const identity = identityFromDecoded(decoded);
  if (!identity) throw Object.assign(new Error('This account is not linked to a valid SLIIT Student ID.'), { code: 'forbidden' });

  const { email, studentId } = identity;
  const allowRef = db.collection('student_allowlist').doc(studentId);
  const profileRef = db.collection('profiles').doc(decoded.uid);
  const claimRef = db.collection('student_claims').doc(studentId);
  const pendingRef = db.collection('pending_registrations').doc(decoded.uid);
  const now = Date.now();
  const expiresAt = now + REGISTRATION_WINDOW_MS;

  await db.runTransaction(async tx => {
    const [allowSnap, profileSnap, claimSnap, pendingSnap] = await Promise.all([
      tx.get(allowRef),
      tx.get(profileRef),
      tx.get(claimRef),
      tx.get(pendingRef)
    ]);

    const allow = allowSnap.data();
    if (!allowSnap.exists || allow?.active !== true || String(allow?.sliitEmail || '').toLowerCase() !== email) {
      throw Object.assign(new Error('This Student ID is not currently approved for FinalForge.'), { code: 'forbidden' });
    }
    if (profileSnap.exists || claimSnap.exists) {
      throw Object.assign(new Error('This account is already active. Sign in normally.'), { code: 'active' });
    }

    tx.set(pendingRef, {
      studentId,
      sliitEmail: email,
      status: 'pending',
      createdAt: pendingSnap.exists ? (pendingSnap.data()?.createdAt || new Date(now)) : new Date(now),
      restartedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(expiresAt)
    }, { merge: true });
  });

  return { studentId, email, expiresAt };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (req.headers.origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Invalid origin.' });
  if (Number(req.headers['content-length'] || 0) > 512) return res.status(413).json({ error: 'Request too large.' });

  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { auth, db } = services();
    const decoded = await auth.verifyIdToken(token, true);
    const result = await restartRegistration(decoded, { db });
    return res.status(200).json({ status: 'pending', email: result.email, expiresAt: result.expiresAt });
  } catch (error) {
    if (error?.code === 'active') return res.status(409).json({ error: error.message, code: 'ALREADY_ACTIVE' });
    if (error?.code === 'forbidden') return res.status(403).json({ error: error.message });
    if (String(error?.code || '').includes('id-token')) return res.status(401).json({ error: 'Authentication required.' });
    return res.status(503).json({ error: 'Registration restart is temporarily unavailable.' });
  }
}
