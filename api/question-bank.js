import {
  QUESTION_COLLECTION,
  httpError,
  publishedQuestionResponse,
  sameOrigin,
  services,
  verifyQuestionReader
} from './_question-bank-core.js';

const MAX_RESULTS = 250;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });

  try {
    const { auth, db } = services();
    await verifyQuestionReader(req, { auth, db });
    const snapshot = await db.collection(QUESTION_COLLECTION)
      .where('status', '==', 'published')
      .limit(MAX_RESULTS)
      .get();
    const questions = snapshot.docs
      .map(publishedQuestionResponse)
      .filter(question => question.id && question.module && question.kind && question.q);
    return res.status(200).json({ questions, limit: MAX_RESULTS });
  } catch (error) {
    const failure = httpError(error);
    return res.status(failure.status).json({ error: failure.message });
  }
}
