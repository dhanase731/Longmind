const map = new Map();
const redisService = require('../storage/redis.service');

const KEY_PREFIX = 'gen:';

// ioredis subscriber for cross-instance cancellation
let subscriber;
try {
  subscriber = redisService.client.duplicate();
  subscriber.subscribe('longmind:gen:stop', (err) => {
    if (err) console.warn('gen subscriber error', err.message);
  });
  subscriber.on('message', (_channel, msg) => {
    try {
      const { generationId } = JSON.parse(msg);
      if (generationId && map.has(generationId)) {
        map.get(generationId).abort();
        map.delete(generationId);
      }
    } catch (e) {}
  });
} catch (e) {
  console.warn('generation manager subscriber failed', e.message);
}

async function register(id, abortController) {
  map.set(id, abortController);
  try {
    await redisService.set(KEY_PREFIX + id, JSON.stringify({ createdAt: new Date().toISOString(), active: true }), 3600);
  } catch (e) {}
}

function get(id) { return map.get(id); }

async function info(id) {
  try {
    const raw = await redisService.get(KEY_PREFIX + id);
    if (!raw) return null;
    return { ...JSON.parse(raw), active: map.has(id) };
  } catch (e) { return null; }
}

async function remove(id) {
  map.delete(id);
  try { await redisService.del(KEY_PREFIX + id); } catch (e) {}
}

module.exports = { register, get, remove, info };
