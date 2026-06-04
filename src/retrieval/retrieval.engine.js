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

    const queryWords = queryText.toLowerCase().split(/\W+/).filter(w => w.length > 2);

    const items = candidates.map(r => {
      const semantic = Math.max(0, r.embedding && r.embedding.length
        ? scoring.cosineSimilarity(queryEmbedding, r.embedding)
        : 0);
      const hours = (Date.now() - new Date(r.created_at)) / 3600000;
      const recency = scoring.recencyScore(hours);
      const importance = r.importance || 0.5;
      const importanceBoost = importance >= 0.8 ? 0.3 : 0;

      // Keyword overlap boost for deterministic embeddings
      const contentWords = (r.content || '').toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const overlap = queryWords.filter(w => contentWords.includes(w)).length;
      const keywordBoost = overlap > 0 ? Math.min(0.4, overlap * 0.15) : 0;

      const final = scoring.finalScore(semantic, recency, importance) + importanceBoost + keywordBoost;
      return {
        memory: { id: r._id, content: r.content, memory_type: r.memory_type, created_at: r.created_at },
        scores: { semantic, recency, importance, final },
        retrievalReason: `Semantic match on ${r.memory_type} memory (score: ${semantic.toFixed(2)})`
      };
    });

    return items
      .filter(i => i.scores.final > 0.05)
      .sort((a, b) => b.scores.final - a.scores.final)
      .slice(0, 8);
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
