const Redis = require('ioredis');
const { REDIS_URL } = require('../config/env');

const redis = new Redis(REDIS_URL);

module.exports = {
  client: redis,
  ping: () => redis.ping(),
  get: (key) => redis.get(key),
  set: (key, value, ttlSec) => (ttlSec ? redis.set(key, value, 'EX', ttlSec) : redis.set(key, value)),
  del: (key) => redis.del(key)
};
