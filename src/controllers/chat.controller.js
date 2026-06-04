const orchestrator = require('../core/orchestrator');

async function chat(req, res, next) {
  try {
    const userId = req.user.userId;
    const { sessionId, message, mode } = req.body;
    const result = await orchestrator.processChat({ userId, sessionId, message, mode });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function stream(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = req.user.userId;
  const { sessionId, message, mode, history } = req.body;
  // ...
  const ac = new AbortController();
  const genManager = require('../core/generation.manager');
  const crypto = require('crypto');
  const generationId = crypto.randomUUID();
  genManager.register(generationId, ac);

  res.write(`event: meta\ndata: ${JSON.stringify({ generationId })}\n\n`);

  let closed = false;
  res.on('close', () => {
    closed = true;
    try { ac.abort(); } catch (e) {}
    try { genManager.remove(generationId); } catch (e) {}
  });

  const onChunk = (chunk) => {
    if (closed) return;
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
  };

  try {
    const result = await orchestrator.processChatStream({ userId, sessionId, message, mode, history: history || [], onChunk, abortSignal: ac.signal });
    if (!closed) {
      res.write(`event: context\ndata: ${JSON.stringify(result.context)}\n\n`);
    }
  } catch (e) {
    if (!closed && e.message !== 'aborted') {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
    }
  } finally {
    try { genManager.remove(generationId); } catch (e) {}
    if (!closed) res.end();
  }
}

async function stop(req, res, next) {
  try {
    const { generationId } = req.body;
    if (!generationId) return res.status(400).json({ error: 'generationId required' });
    const genManager = require('../core/generation.manager');
    const ac = genManager.get(generationId);
    if (!ac) return res.status(404).json({ error: 'not found or already finished' });
    try { ac.abort(); } catch (e) {}
    genManager.remove(generationId);
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function status(req, res, next) {
  try {
    const { generationId } = req.params;
    if (!generationId) return res.status(400).json({ error: 'generationId required' });
    const genManager = require('../core/generation.manager');
    const info = await genManager.info(generationId);
    if (!info) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true, info });
  } catch (e) {
    next(e);
  }
}

module.exports = { chat, stream, stop, status };
