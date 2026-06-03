const memoryService = require('../memory/memory.service');
const retrieval = require('../retrieval/retrieval.engine');
const compressor = require('../utils/compressor');
const gemini = require('../adapters/gemini.adapter');
const extractor = require('../memory/memory.extractor');
const memoryMode = require('../governance/memoryMode.manager');
const { User } = require('../storage/mongo.service');

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

  // Governance: enforce BEFORE retrieval
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

  // Compress context
  const context = compressor.pack(retrieved, 3000);

  // Pull out identity facts for explicit injection
  const identityFacts = retrieved
    .filter(r => r.memory?.content)
    .map(r => r.memory.content)
    .join('\n');

  // Assemble prompt
  const systemPrompt = identityFacts
    ? `You are a helpful assistant. You know the following facts about the user:\n${identityFacts}\n\nUse these facts naturally in your response. Do not say you don't know something that is listed above.`
    : context
    ? `You are a helpful assistant with access to the user's memory context below. Use it to personalize your response.\n\n[MEMORY CONTEXT]\n${context}`
    : `You are a helpful assistant.`;
  const prompt = `${systemPrompt}\n\n[USER]\n${message}`;

  // Invoke Gemini
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

  const context = compressor.pack(retrieved, 3000);
  const identityFacts = retrieved
    .filter(r => r.memory?.content)
    .map(r => r.memory.content)
    .join('\n');

  const systemPrompt = identityFacts
    ? `You are a helpful assistant. You know the following facts about the user:\n${identityFacts}\n\nUse these facts naturally in your response. Do not say you don't know something that is listed above.`
    : context
    ? `You are a helpful assistant with access to the user's memory context below. Use it to personalize your response.\n\n[MEMORY CONTEXT]\n${context}`
    : `You are a helpful assistant.`;
  const prompt = `${systemPrompt}\n\n[USER]\n${message}`;

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
