import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function db() {
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
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const snap = await db().collection('platform_stats').doc('public').get();
    const data = snap.exists ? snap.data() : {};
    const registered = Math.max(0, Number(data.registered || 0));
    const ratingCount = Math.max(0, Number(data.ratingCount || 0));
    const ratingSum = Math.max(0, Number(data.ratingSum || 0));
    const studyingNow = Number.isFinite(Number(data.studyingNow)) ? Math.max(0, Number(data.studyingNow)) : null;
    return res.status(200).json({
      registered,
      studyingNow,
      ratingCount,
      ratingAverage: ratingCount ? ratingSum / ratingCount : null
    });
  } catch {
    return res.status(200).json({ registered: 0, studyingNow: null, ratingCount: 0, ratingAverage: null });
  }
}
