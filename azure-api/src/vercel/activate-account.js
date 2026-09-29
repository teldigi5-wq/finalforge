import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

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

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function coded(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function activateStudent(decoded, { db }) {
  if (decoded?.email_verified !== true || decoded?.admin === true) {
    throw coded('Verified student authentication is required.', 'forbidden');
  }
  const identity = identityFromDecoded(decoded);
  if (!identity) throw coded('This account is not linked to a valid SLIIT Student ID.', 'forbidden');

  const { studentId, email } = identity;
  const allowRef = db.collection('student_allowlist').doc(studentId);
  const profileRef = db.collection('profiles').doc(decoded.uid);
  const claimRef = db.collection('student_claims').doc(studentId);
  const pendingRef = db.collection('pending_registrations').doc(decoded.uid);
  const statsRef = db.collection('platform_stats').doc('public');
  const now = Date.now();

  const result = await db.runTransaction(async tx => {
    const [allowSnap, profileSnap, claimSnap, pendingSnap] = await Promise.all([
      tx.get(allowRef),
      tx.get(profileRef),
      tx.get(claimRef),
      tx.get(pendingRef)
    ]);

    const allow = allowSnap.data();
    if (!allowSnap.exists || allow?.active !== true || String(allow?.sliitEmail || '').toLowerCase() !== email) {
      throw coded('This Student ID is not currently approved for FinalForge.', 'forbidden');
    }

    if (claimSnap.exists && claimSnap.data()?.uid !== decoded.uid) {
      throw coded('This Student ID is already claimed by another account.', 'conflict');
    }

    if (profileSnap.exists) {
      const profile = profileSnap.data();
      if (profile?.role !== 'student' || profile?.studentId !== studentId ||
          String(profile?.sliitEmail || '').toLowerCase() !== email ||
          profile?.emailVerified !== true || profile?.disabled === true) {
        throw coded('The student profile is invalid or disabled.', 'forbidden');
      }
      if (!claimSnap.exists) {
        tx.set(claimRef, {
          studentId,
          uid: decoded.uid,
          createdAt: FieldValue.serverTimestamp()
        });
      }
      tx.set(profileRef, { lastLoginAt: FieldValue.serverTimestamp() }, { merge: true });
      if (pendingSnap.exists) {
        tx.set(pendingRef, {
          status: 'activated',
          activatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      return { studentId, existing: true, legacy: false };
    }

    let legacy = false;
    if (pendingSnap.exists) {
      const pending = pendingSnap.data();
      if (pending?.studentId !== studentId || String(pending?.sliitEmail || '').toLowerCase() !== email) {
        throw coded('The pending registration does not match this account.', 'forbidden');
      }
      const expiresAt = millis(pending?.expiresAt);
      if (!expiresAt || expiresAt <= now) {
        throw coded('Your 20-minute registration window expired. Start registration again to continue.', 'registration-expired');
      }
    } else {
      legacy = true;
    }

    if (!claimSnap.exists) {
      tx.set(claimRef, {
        studentId,
        uid: decoded.uid,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    tx.set(profileRef, {
      role: 'student',
      studentId,
      sliitEmail: email,
      emailVerified: true,
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp()
    });

    tx.set(statsRef, {
      registered: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (pendingSnap.exists) {
      tx.set(pendingRef, {
        status: 'activated',
        activatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { studentId, existing: false, legacy };
  });

  return result;
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
    const result = await activateStudent(decoded, { db });
    return res.status(200).json({ status: 'active', studentId: result.studentId, recovered: result.legacy === true });
  } catch (error) {
    if (error?.code === 'registration-expired') return res.status(410).json({ error: error.message, code: 'REGISTRATION_EXPIRED' });
    if (error?.code === 'conflict') return res.status(409).json({ error: error.message });
    if (error?.code === 'forbidden') return res.status(403).json({ error: error.message });
    if (String(error?.code || '').includes('id-token')) return res.status(401).json({ error: 'Authentication required.' });
    return res.status(503).json({ error: 'Account activation is temporarily unavailable.' });
  }
}
