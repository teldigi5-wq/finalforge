import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createResourceUrlHandler } from './_resource-url-core.js';
import { getResourceById } from './_resource-manifest-v1.js';

const SIGNED_URL_TTL_SECONDS = 90;

function firebaseServices() {
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

async function verifyIdToken(token) {
  const { auth } = firebaseServices();
  return auth.verifyIdToken(token, true);
}

async function loadStudentEntitlement(decoded) {
  const { db } = firebaseServices();
  const uid = String(decoded?.uid || '');
  if (!uid) return null;

  const profileSnap = await db.collection('profiles').doc(uid).get();
  if (!profileSnap.exists) return { profile: null, allowlist: null, claim: null };
  const profile = profileSnap.data() || {};
  const studentId = String(profile.studentId || '').trim().toUpperCase();
  if (!/^IT\d{8}$/.test(studentId)) return { profile, allowlist: null, claim: null };

  const [allowlistSnap, claimSnap] = await Promise.all([
    db.collection('student_allowlist').doc(studentId).get(),
    db.collection('student_claims').doc(studentId).get()
  ]);
  return {
    profile,
    allowlist: allowlistSnap.exists ? allowlistSnap.data() : null,
    claim: claimSnap.exists ? claimSnap.data() : null
  };
}

function storageConfig() {
  const rawUrl = String(process.env.FINALFORGE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const secret = String(process.env.FINALFORGE_SUPABASE_SECRET_KEY || '').trim();
  const bucket = String(process.env.FINALFORGE_SUPABASE_BUCKET || 'finalforge-resources').trim();
  if (!rawUrl || !secret) throw new Error('FinalForge private storage is not configured');
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw new Error('Unexpected private storage origin');
  if (!/^[a-z0-9][a-z0-9._-]{1,62}$/.test(bucket)) throw new Error('Invalid storage bucket');
  return { origin: url.origin, secret, bucket };
}

function encodeStoragePath(path) {
  return String(path || '').split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function absoluteSignedUrl(origin, signedURL) {
  const value = String(signedURL || '');
  let url;
  if (/^https:\/\//i.test(value)) url = new URL(value);
  else if (value.startsWith('/storage/v1/')) url = new URL(value, origin);
  else if (value.startsWith('/object/')) url = new URL(`/storage/v1${value}`, origin);
  else url = new URL(`/storage/v1/${value.replace(/^\/+/, '')}`, origin);
  if (url.origin !== origin || url.protocol !== 'https:') throw new Error('Unexpected signed URL origin');
  return url.href;
}

async function signResource(storagePath) {
  const { origin, secret, bucket } = storageConfig();
  const endpoint = `${origin}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeStoragePath(storagePath)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': secret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));
  const signedURL = payload?.signedURL || payload?.signedUrl;
  if (!response.ok || !signedURL) throw new Error('Storage signing failed');
  return { url: absoluteSignedUrl(origin, signedURL), expiresIn: SIGNED_URL_TTL_SECONDS };
}

const handler = createResourceUrlHandler({ verifyIdToken, loadStudentEntitlement, getResourceById, signResource });
export default handler;
