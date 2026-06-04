const gemini = require('../adapters/gemini.adapter');
const { Memory } = require('../storage/mongo.service');
const scoring = require('../utils/scoring');
const modeManager = require('../governance/memoryMode.manager');

async function recall(userId, queryText, options = {}) {
  const queryEmbedding = await gemini.embed(queryText);
  const allowedTypes = options.mode ? modeManager.allowedTypes(options.mode) : null;

  try {
    const filter = { user_id: userId };
    if (allowedTypes && allowedTypes.length) filter.memory_type = { $in: allowedTypes };

    // Fetch candidates with embeddings for JS-side cosine scoring
    const candidates = await Memory.find(filter)
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    const queryWords = new Set(queryText.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    const scored = candidates.map(r => {
      const semantic = Math.max(0, r.embedding && r.embedding.length
        ? scoring.cosineSimilarity(queryEmbedding, r.embedding)
        : 0);
      const hours = (Date.now() - new Date(r.created_at)) / 3600000;
      const recency = scoring.recencyScore(hours);
      const importance = r.importance || 0.5;

      const contentWords = new Set((r.content || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
      const overlap = [...queryWords].filter(w => contentWords.has(w)).length;
      const keywordBoost = overlap > 0 ? Math.min(0.5, overlap * 0.2) : 0;
      const importanceBoost = importance >= 0.7 ? 0.25 : 0;

      const final = scoring.finalScore(semantic, recency, importance) + importanceBoost + keywordBoost;
      return {
        memory: { id: r._id, content: r.content, memory_type: r.memory_type, created_at: r.created_at },
        scores: { semantic, recency, importance, final },
        retrievalReason: `score:${final.toFixed(2)} keyword:${keywordBoost.toFixed(2)} importance:${importanceBoost.toFixed(2)}`
      };
    });

    const results = scored
      .filter(i => i.scores.final > 0.3)
      .sort((a, b) => b.scores.final - a.scores.final)
      .slice(0, 5);

    // Fallback: if nothing scored high enough, return top 3 by importance
    if (results.length === 0) {
      return candidates
        .sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5))
        .slice(0, 3)
        .map(r => ({
          memory: { id: r._id, content: r.content, memory_type: r.memory_type, created_at: r.created_at },
          scores: { semantic: 0, recency: 0, importance: r.importance || 0.5, final: r.importance || 0.5 },
          retrievalReason: 'importance fallback'
        }));
    }

    return results;
  } catch (e) {
    console.warn('retrieval error, fallback to recent', e.message);
    try {
      const filter = { user_id: userId };
      if (allowedTypes && allowedTypes.length) filter.memory_type = { $in: allowedTypes };
      const recent = await Memory.find(filter, { embedding: 0 })
        .sort({ created_at: -1 }).limit(5).lean();
      return recent.map(r => {
        const hours = (Date.now() - new Date(r.created_at)) / 3600000;
        const recency = scoring.recencyScore(hours);
        const importance = r.importance || 0.5;
        return {
          memory: { id: r._id, content: r.content, memory_type: r.memory_type, created_at: r.created_at },
          scores: { semantic: 0, recency, importance, final: scoring.finalScore(0, recency, importance) },
          retrievalReason: 'Recent memory (fallback — vector unavailable)'
        };
      });
    } catch (e2) {
      console.warn('fallback retrieval failed', e2.message);
      return [];
    }
  }
}

module.exports = { recall };
