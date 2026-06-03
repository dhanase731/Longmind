function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

function recencyScore(hoursSince) {
  return Math.exp(-0.01 * hoursSince);
}

function finalScore(semantic, recency, importance) {
  return 0.6 * semantic + 0.25 * recency + 0.15 * importance;
}

module.exports = { cosineSimilarity, recencyScore, finalScore };
