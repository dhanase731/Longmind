const required = [
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'GEMINI_API_KEY'
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn('Missing ENV variables:', missing.join(', '));
}

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  PORT: process.env.PORT || 3000
};
