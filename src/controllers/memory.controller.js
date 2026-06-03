const memoryService = require('../memory/memory.service');
const { Memory } = require('../storage/mongo.service');

async function list(req, res, next) {
  try {
    const userId = req.user.userId;
    const { type, limit = 50, offset = 0 } = req.query;
    const items = await memoryService.list(userId, type, parseInt(limit, 10), parseInt(offset, 10));
    res.json({ memories: items });
  } catch (e) {
    next(e);
  }
}

async function deleteById(req, res, next) {
  try {
    await memoryService.delete({ id: req.params.id, userId: req.user.userId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function deleteBySession(req, res, next) {
  try {
    await memoryService.delete({ sessionId: req.params.sessionId, userId: req.user.userId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function deleteAll(req, res, next) {
  try {
    const result = await Memory.deleteMany({ user_id: req.user.userId });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, deleteById, deleteBySession, deleteAll };
