const { Memory } = require('../storage/mongo.service');
const gemini = require('../adapters/gemini.adapter');
const redis = require('../storage/redis.service');
const { cosineSimilarity } = require('../utils/scoring');

async function store(memoryObject) {
  const {
    userId, sessionId,
    source_type = 'assistant',
    memory_type = 'episodic',
    content, importance = 0.5, confidence = 0.8,
    tags = [], metadata = {}, expires_at = null
  } = memoryObject;

  const embedding = await gemini.embed(content);

  // Duplicate guard: check recent memories for cosine similarity > 0.95
  try {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await Memory.find(
      { user_id: userId, created_at: { $gte: cutoff } },
      { _id: 1, embedding: 1 }
    ).limit(50).lean();

    for (const r of recent) {
      if (r.embedding && r.embedding.length && cosineSimilarity(embedding, r.embedding) > 0.95) {
        await Memory.findByIdAndUpdate(r._id, { content, embedding, confidence, importance, tags, metadata, expires_at });
        return { updated: true, id: r._id };
      }
    }
  } catch (e) {
    console.warn('duplicate guard failed', e.message);
  }

  const mem = await Memory.create({
    user_id: userId, session_id: sessionId || null,
    source_type, memory_type, content, embedding,
    confidence, importance, tags, metadata, expires_at
  });

  if (memory_type === 'stm' && sessionId) {
    const key = `stm:${userId}:${sessionId}`;
    try {
      const cur = JSON.parse((await redis.get(key)) || '[]');
      cur.push({ content, created_at: new Date().toISOString() });
      await redis.set(key, JSON.stringify(cur.slice(-10)), 86400);
    } catch (e) { console.warn('redis stm write failed', e.message); }
  }

  return { id: mem._id };
}

async function recall(userId, queryText, filters = {}) {
  const retrieval = require('../retrieval/retrieval.engine');
  return retrieval.recall(userId, queryText, filters);
}

async function del(criteria) {
  if (criteria.id && criteria.userId)
    await Memory.deleteOne({ _id: criteria.id, user_id: criteria.userId });
  else if (criteria.sessionId && criteria.userId)
    await Memory.deleteMany({ session_id: criteria.sessionId, user_id: criteria.userId });
}

async function list(userId, type, limit = 50, offset = 0) {
  const filter = { user_id: userId };
  if (type) filter.memory_type = type;
  const items = await Memory.find(filter, { embedding: 0 })
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
  return items.map(m => ({ ...m, id: m._id }));
}

module.exports = { store, recall, delete: del, list };
