import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const QUESTION_COLLECTION = 'question_bank_v1';
export const ALLOWED_MODULES = new Set(['ip', 'dcn', 'mc', 'fc']);
export const ALLOWED_KINDS = new Set(['mcq', 'code']);
export const ALLOWED_STATUS = new Set(['draft', 'published']);

export function services() {
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

export function readToken(req) {
  const direct = String(req.headers['x-finalforge-token'] || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = direct || bearer;
  return token && token.length <= 8192 ? token : '';
}

export function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  return origin === `https://${req.headers.host}`;
}

export async function verifyDecoded(req, auth) {
  const token = readToken(req);
  if (!token) {
    const error = new Error('Authentication required.');
    error.code = 'unauthenticated';
    throw error;
  }
  try {
    return await auth.verifyIdToken(token, true);
  } catch {
    const error = new Error('Authentication required.');
    error.code = 'unauthenticated';
    throw error;
  }
}

export async function verifyAdmin(req, auth) {
  const decoded = await verifyDecoded(req, auth);
  if (decoded?.admin !== true || decoded?.email_verified !== true) {
    const error = new Error('Verified administrator access is required.');
    error.code = 'forbidden';
    throw error;
  }
  return decoded;
}

export async function verifyQuestionReader(req, { auth, db }) {
  const decoded = await verifyDecoded(req, auth);
  if (decoded?.email_verified !== true) {
    const error = new Error('Verified account access is required.');
    error.code = 'forbidden';
    throw error;
  }
  if (decoded?.admin === true) return decoded;

  const uid = String(decoded?.uid || '');
  const email = String(decoded?.email || '').trim().toLowerCase();
  if (!uid || !email) {
    const error = new Error('Approved student access is required.');
    error.code = 'forbidden';
    throw error;
  }

  const profileRef = db.collection('profiles').doc(uid);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.data();
  const studentId = String(profile?.studentId || '').trim().toUpperCase();
  if (!profileSnap.exists || profile?.role !== 'student' || profile?.disabled === true ||
      profile?.emailVerified !== true || String(profile?.sliitEmail || '').trim().toLowerCase() !== email ||
      !/^IT\d{8}$/.test(studentId)) {
    const error = new Error('Approved student access is required.');
    error.code = 'forbidden';
    throw error;
  }

  const [allowSnap, claimSnap] = await Promise.all([
    db.collection('student_allowlist').doc(studentId).get(),
    db.collection('student_claims').doc(studentId).get()
  ]);
  const allow = allowSnap.data();
  const claim = claimSnap.data();
  if (!allowSnap.exists || allow?.active !== true || String(allow?.sliitEmail || '').trim().toLowerCase() !== email ||
      !claimSnap.exists || claim?.uid !== uid) {
    const error = new Error('Approved student access is required.');
    error.code = 'forbidden';
    throw error;
  }
  return decoded;
}

function cleanText(value, max, label, { required = false } = {}) {
  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (required && !text) throw fieldError(`${label} is required.`);
  if (text.length > max) throw fieldError(`${label} is too long.`);
  return text;
}

function fieldError(message) {
  const error = new Error(message);
  error.code = 'invalid-question';
  return error;
}

function cleanArray(value, maxItems, maxLength, label) {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw fieldError(`${label} has too many items.`);
  return value.map((item, index) => cleanText(item, maxLength, `${label} item ${index + 1}`, { required: true }));
}

export function normalizeQuestion(input, { existing = null } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fieldError('Question payload is required.');
  const allowed = new Set(['module','kind','status','topic','coverage','q','o','a','e','snippet','p','starter','pattern']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw fieldError(`Unexpected question field: ${key}`);

  const module = cleanText(input.module, 12, 'Module', { required: true }).toLowerCase();
  const kind = cleanText(input.kind, 12, 'Question type', { required: true }).toLowerCase();
  const status = cleanText(input.status, 12, 'Status', { required: true }).toLowerCase();
  if (!ALLOWED_MODULES.has(module)) throw fieldError('Unsupported module.');
  if (!ALLOWED_KINDS.has(kind)) throw fieldError('Unsupported question type.');
  if (!ALLOWED_STATUS.has(status)) throw fieldError('Unsupported question status.');

  const coverage = Number(input.coverage);
  if (!Number.isInteger(coverage) || coverage < 1 || coverage > 30) throw fieldError('Coverage must be a whole number from 1 to 30.');
  const topic = cleanText(input.topic, 160, 'Topic', { required: true });
  const q = cleanText(input.q, 4000, 'Question', { required: true });
  const explanation = cleanText(input.e, 3500, 'Explanation');
  const snippet = cleanText(input.snippet, 5000, 'Code snippet');
  const starter = cleanText(input.starter, 10000, 'Starter code');
  const pattern = cleanText(input.pattern, 80, 'Pattern');

  if (kind === 'mcq') {
    const options = cleanArray(input.o, 6, 800, 'Options');
    if (options.length < 2) throw fieldError('MCQ questions need at least two options.');
    if (new Set(options.map(option => option.toLowerCase())).size !== options.length) throw fieldError('MCQ options must be unique.');
    const answer = Number(input.a);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw fieldError('Correct answer must match one option.');
    return { module, kind, status, topic, coverage, q, o: options, a: answer, e: explanation, snippet, p: [], starter: '', pattern: '' };
  }

  const points = cleanArray(input.p, 12, 700, 'Rubric');
  if (!points.length) throw fieldError('Coding questions need at least one self-check rubric point.');
  return { module, kind, status, topic, coverage, q, o: [], a: null, e: explanation, snippet, p: points, starter, pattern };
}

function stamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function adminQuestionResponse(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: String(doc.id || data.id || ''),
    module: data.module,
    kind: data.kind,
    status: data.status,
    topic: data.topic,
    coverage: data.coverage,
    q: data.q,
    o: Array.isArray(data.o) ? data.o : [],
    a: Number.isInteger(data.a) ? data.a : null,
    e: data.e || '',
    snippet: data.snippet || '',
    p: Array.isArray(data.p) ? data.p : [],
    starter: data.starter || '',
    pattern: data.pattern || '',
    createdAt: stamp(data.createdAt),
    updatedAt: stamp(data.updatedAt),
    createdByEmail: data.createdByEmail || '',
    updatedByEmail: data.updatedByEmail || ''
  };
}

export function publishedQuestionResponse(doc) {
  const data = doc.data ? doc.data() : doc;
  return {
    id: String(doc.id || data.id || ''),
    module: data.module,
    kind: data.kind,
    topic: data.topic,
    coverage: data.coverage,
    q: data.q,
    o: Array.isArray(data.o) ? data.o : [],
    a: Number.isInteger(data.a) ? data.a : null,
    e: data.e || '',
    snippet: data.snippet || '',
    p: Array.isArray(data.p) ? data.p : [],
    starter: data.starter || '',
    pattern: data.pattern || '',
    updatedAt: stamp(data.updatedAt)
  };
}

export function adminWriteFields(question, decoded, { creating = false } = {}) {
  const email = String(decoded?.email || '').trim().toLowerCase();
  const base = {
    ...question,
    schemaVersion: 1,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: decoded.uid,
    updatedByEmail: email
  };
  if (creating) {
    base.createdAt = FieldValue.serverTimestamp();
    base.createdByUid = decoded.uid;
    base.createdByEmail = email;
  }
  return base;
}

export function httpError(error) {
  const code = String(error?.code || '');
  if (code === 'unauthenticated') return { status: 401, message: 'Authentication required.' };
  if (code === 'forbidden') return { status: 403, message: error.message || 'Access denied.' };
  if (code === 'invalid-question') return { status: 400, message: error.message || 'Invalid question.' };
  return { status: 503, message: 'Question service is temporarily unavailable.' };
}
