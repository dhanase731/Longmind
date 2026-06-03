const memoryService = require('../memory/memory.service');
const retrieval = require('../retrieval/retrieval.engine');
const compressor = require('../utils/compressor');
const gemini = require('../adapters/gemini.adapter');
const extractor = require('../memory/memory.extractor');
const memoryMode = require('../governance/memoryMode.manager');
const { User } = require('../storage/mongo.service');

function _buildPrompt(message, retrieved) {
  const facts = retrieved
    .filter(r => r.memory?.content)
    .map(r => r.memory.content);

  if (facts.length) {
    return `You are a helpful assistant. You know the following facts about the user — use them naturally and NEVER claim you don't know something listed here:\n${facts.map(f => `- ${f}`).join('\n')}\n\n[USER]\n${message}`;
  }
  return `You are a helpful assistant.\n\n[USER]\n${message}`;
}

async function _resolveMode(userId, mode) {
  if (mode) return memoryMode.normalize(mode);
  try {
    const user = await User.findById(userId);
    return memoryMode.normalize(user?.default_memory_mode);
  } catch (e) {
    return 'FULL';
  }
}

async function processChat({ userId, sessionId, message, mode }) {
  const effectiveMode = await _resolveMode(userId, mode);

  const canRetrieve = memoryMode.allowRetrieval(effectiveMode);
  let retrieved = [];
  if (canRetrieve) {
    try {
      retrieved = await retrieval.recall(userId, message, { mode: effectiveMode });
    } catch (e) {
      console.warn('retrieval failed, continuing without context', e.message);
    }
  }

  const prompt = _buildPrompt(message, retrieved);
  const response = await gemini.generate(prompt);

  // Memory extraction (rule-based)
  let extracted = [];
  try {
    extracted = extractor.extract({ userMessage: message, assistantReply: response.text });
  } catch (e) {
    console.warn('memory extraction failed', e.message);
    extracted = [];
  }

  // Governance: enforce BEFORE storage
  const canStore = memoryMode.allowStorage(effectiveMode);
  if (canStore && extracted.length) {
    const allowed = memoryMode.allowedTypes(effectiveMode);
    for (const mem of extracted) {
      if (allowed.includes(mem.memoryType)) {
        try {
          await memoryService.store({ userId, sessionId, source_type: 'assistant', content: mem.content, memory_type: mem.memoryType, importance: mem.importance, tags: mem.tags, metadata: mem.metadata });
        } catch (e) {
          console.warn('failed to store memory', e.message);
        }
      }
    }
  }

  return { reply: response.text, context: { mode: effectiveMode, memoriesUsed: retrieved.length, sources: retrieved } };
}

module.exports = { processChat };
module.exports.processChatStream = async function ({ userId, sessionId, message, mode, onChunk, abortSignal }) {
  const effectiveMode = await _resolveMode(userId, mode);
  const canRetrieve = memoryMode.allowRetrieval(effectiveMode);
  let retrieved = [];
  if (canRetrieve) {
    try {
      retrieved = await retrieval.recall(userId, message, { mode: effectiveMode });
    } catch (e) {
      console.warn('retrieval failed, continuing without context', e.message);
      retrieved = [];
    }
  }

  const prompt = _buildPrompt(message, retrieved);

  let finalText = '';
  try {
    await gemini.stream(prompt, async (chunk) => {
      finalText += chunk;
      try { await onChunk(chunk); } catch (e) {}
    }, { signal: abortSignal });
  } catch (e) {
    console.error('streaming failed:', e.message);
    const r = await gemini.generate(prompt);
    finalText = r.text || '';
    await onChunk(finalText);
  }

  let extracted = [];
  try {
    extracted = extractor.extract({ userMessage: message, assistantReply: finalText });
  } catch (e) {
    console.warn('memory extraction failed', e.message);
  }

  const canStore = memoryMode.allowStorage(effectiveMode);
  if (canStore && extracted.length) {
    const allowed = memoryMode.allowedTypes(effectiveMode);
    for (const mem of extracted) {
      if (allowed.includes(mem.memoryType)) {
        try {
          await memoryService.store({ userId, sessionId, source_type: 'assistant', content: mem.content, memory_type: mem.memoryType, importance: mem.importance, tags: mem.tags, metadata: mem.metadata });
        } catch (e) {
          console.warn('failed to store memory', e.message);
        }
      }
    }
  }

  return { reply: finalText, context: { mode: effectiveMode, memoriesUsed: retrieved.length, sources: retrieved } };
};
