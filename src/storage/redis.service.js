const Redis = require('ioredis');
const { REDIS_URL } = require('../config/env');

let redis = null;

try {
  if (!REDIS_URL) throw new Error('REDIS_URL not set');
  redis = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
  redis.on('error', (e) => console.warn('Redis error:', e.message));
} catch (e) {
  console.warn('Redis init failed:', e.message);
}

const noop = () => Promise.resolve(null);

module.exports = {
  client: redis,
  ping: () => redis ? redis.ping() : noop(),
  get: (key) => redis ? redis.get(key) : noop(),
  set: (key, value, ttlSec) => redis ? (ttlSec ? redis.set(key, value, 'EX', ttlSec) : redis.set(key, value)) : noop(),
  del: (key) => redis ? redis.del(key) : noop()
};
