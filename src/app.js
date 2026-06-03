const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const yaml = require('js-yaml');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const { FRONTEND_URL } = require('./config/env');
const { connect: connectMongo, mongoose } = require('./storage/mongo.service');
const authRoutes = require('./api/auth.routes');
const chatRoutes = require('./api/chat.routes');
const memoryRoutes = require('./api/memory.routes');
const governanceRoutes = require('./api/governance.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { logger } = require('./middleware/logger.middleware');
const janitor = require('./background/janitor');

const app = express();

// Connect MongoDB (non-blocking start, routes will fail gracefully until connected)
connectMongo().catch(e => console.error('MongoDB init error:', e.message));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', FRONTEND_URL].filter(Boolean),
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors({ origin: ['http://localhost:5173', 'http://localhost:5174', FRONTEND_URL].filter(Boolean), credentials: true }));
app.use(logger);

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(generalLimiter);
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/memories', memoryRoutes);
app.use('/governance', governanceRoutes);

app.get('/health', async (req, res) => {
  const redis = require('./storage/redis.service');
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try { await redis.ping(); redisOk = true; } catch (e) {}
  res.json({ status: 'ok', services: { mongodb: mongoOk, redis: redisOk } });
});

const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger', 'swagger.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorHandler);

try {
  janitor.start(60);
} catch (e) {
  console.warn('Failed to start janitor', e.message);
}

module.exports = app;
