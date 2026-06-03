const { Memory } = require('../storage/mongo.service');
const { cosineSimilarity } = require('../utils/scoring');

async function cleanupExpired() {
  try {
    const r = await Memory.deleteMany({ expires_at: { $ne: null, $lt: new Date() } });
    console.log(`janitor: removed ${r.deletedCount} expired memories`);
  } catch (e) {
    console.warn('janitor cleanupExpired failed', e.message);
  }
}

async function decayStale() {
  try {
    const cutoff = new Date(Date.now() - 180 * 24 * 3600 * 1000);
    const r = await Memory.updateMany(
      { created_at: { $lt: cutoff } },
      [{ $set: { importance: { $max: [0, { $multiply: ['$importance', 0.99] }] } } }]
    );
    console.log(`janitor: decayed ${r.modifiedCount} stale memories`);
  } catch (e) {
    console.warn('janitor decayStale failed', e.message);
  }
}

async function runDedupe() {
  try {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    // Group by user_id + content exact match, keep newest
    const dupes = await Memory.aggregate([
      { $match: { created_at: { $gte: cutoff } } },
      { $sort: { created_at: -1 } },
      { $group: { _id: { user_id: '$user_id', content: '$content' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    const toDelete = dupes.flatMap(d => d.ids.slice(1)); // keep first (newest), delete rest
    if (toDelete.length) {
      await Memory.deleteMany({ _id: { $in: toDelete } });
      console.log(`janitor: deduped ${toDelete.length} memories`);
    }
  } catch (e) {
    console.warn('janitor runDedupe failed', e.message);
  }
}

function start(intervalMinutes = 60) {
  cleanupExpired();
  decayStale();
  runDedupe();
  setInterval(() => {
    cleanupExpired();
    decayStale();
    runDedupe();
  }, intervalMinutes * 60 * 1000);
}

module.exports = { start };
