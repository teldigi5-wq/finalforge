import {
  QUESTION_COLLECTION,
  adminQuestionResponse,
  adminWriteFields,
  httpError,
  normalizeQuestion,
  sameOrigin,
  services,
  verifyAdmin
} from './_question-bank-core.js';

const MAX_BODY_BYTES = 32768;
const MAX_RESULTS = 250;

function bodySize(req) {
  const header = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(header) && header > 0) return header;
  try { return Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8'); }
  catch { return MAX_BODY_BYTES + 1; }
}

function readBody(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {};
  return req.body;
}

function validId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{8,160}$/.test(id) ? id : '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
  if (req.method !== 'GET' && bodySize(req) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Request too large.' });

  try {
    const { auth, db } = services();
    const decoded = await verifyAdmin(req, auth);
    const collection = db.collection(QUESTION_COLLECTION);

    if (req.method === 'GET') {
      const snapshot = await collection.orderBy('updatedAt', 'desc').limit(MAX_RESULTS).get();
      return res.status(200).json({ questions: snapshot.docs.map(adminQuestionResponse), limit: MAX_RESULTS });
    }

    const body = readBody(req);
    if (req.method === 'POST') {
      if (Object.keys(body).some(key => !['question'].includes(key))) return res.status(400).json({ error: 'Unexpected request fields.' });
      const question = normalizeQuestion(body.question);
      const ref = collection.doc();
      await ref.set(adminWriteFields(question, decoded, { creating: true }));
      const saved = await ref.get();
      return res.status(201).json({ question: adminQuestionResponse(saved) });
    }

    const id = validId(body.id);
    if (!id) return res.status(400).json({ error: 'Valid question ID is required.' });
    if (Object.keys(body).some(key => !['id', 'question'].includes(key))) return res.status(400).json({ error: 'Unexpected request fields.' });
    const ref = collection.doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Question not found.' });

    if (req.method === 'DELETE') {
      if ('question' in body) return res.status(400).json({ error: 'Delete requests cannot include a question payload.' });
      await ref.delete();
      return res.status(200).json({ deleted: true, id });
    }

    const question = normalizeQuestion(body.question, { existing: existing.data() });
    await ref.set(adminWriteFields(question, decoded), { merge: true });
    const saved = await ref.get();
    return res.status(200).json({ question: adminQuestionResponse(saved) });
  } catch (error) {
    const failure = httpError(error);
    return res.status(failure.status).json({ error: failure.message });
  }
}
