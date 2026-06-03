const { User, Session } = require('../storage/mongo.service');
const memoryMode = require('../governance/memoryMode.manager');

async function setMode(req, res, next) {
  try {
    const { sessionId, mode } = req.body;
    if (!memoryMode.isValid(mode)) return res.status(400).json({ error: 'invalid mode' });
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, { memory_mode: mode });
      return res.json({ ok: true, sessionId, mode });
    }
    const userId = req.user.userId;
    await User.findByIdAndUpdate(userId, { default_memory_mode: mode });
    return res.json({ ok: true, mode });
  } catch (e) {
    next(e);
  }
}

async function getMode(req, res, next) {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.query;
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session) return res.json({ mode: session.memory_mode || 'FULL' });
    }
    const user = await User.findById(userId);
    const mode = user?.default_memory_mode || 'FULL';
    return res.json({ mode });
  } catch (e) {
    next(e);
  }
}

module.exports = { setMode, getMode };
