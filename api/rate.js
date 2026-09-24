import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
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
  return getFirestore();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (req.headers.origin !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Invalid origin.' });
  if (!process.env.SIGNUP_RATE_SECRET) return res.status(503).json({ error: 'Rating is temporarily unavailable.' });

  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be from 1 to 5.' });

  try {
    const store = services();
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0];
    const digest = createHash('sha256').update(`${process.env.SIGNUP_RATE_SECRET}:rating:${ip}`).digest('hex');
    const rateRef = store.collection('rating_rate').doc(digest);
    const statsRef = store.collection('platform_stats').doc('public');
    const now = Date.now();

    await store.runTransaction(async tx => {
      const prior = await tx.get(rateRef);
      const lastAt = Number(prior.data()?.lastAt || 0);
      if (lastAt > now - 30 * 86400000) throw Object.assign(new Error('already-rated'), { code: 'already-rated' });
      tx.set(rateRef, { lastAt: now, expiresAt: new Date(now + 35 * 86400000) }, { merge: true });
      tx.set(statsRef, {
        ratingSum: FieldValue.increment(rating),
        ratingCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });

    const snap = await statsRef.get();
    const data = snap.data() || {};
    const ratingCount = Math.max(0, Number(data.ratingCount || 0));
    const ratingSum = Math.max(0, Number(data.ratingSum || 0));
    return res.status(200).json({ ratingCount, ratingAverage: ratingCount ? ratingSum / ratingCount : rating });
  } catch (error) {
    if (error?.code === 'already-rated' || error?.message === 'already-rated') return res.status(409).json({ error: 'A rating was already submitted recently from this connection.' });
    return res.status(503).json({ error: 'Rating is temporarily unavailable.' });
  }
}
