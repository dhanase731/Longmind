const memoryService = require('../memory/memory.service');
const retrieval = require('../retrieval/retrieval.engine');
const compressor = require('../utils/compressor');
const gemini = require('../adapters/gemini.adapter');
const extractor = require('../memory/memory.extractor');
const memoryMode = require('../governance/memoryMode.manager');
const { User } = require('../storage/mongo.service');

function _buildPrompt(message, retrieved, history = [], incognito = false) {
  if (incognito) {
    return `You are a helpful assistant. You have no memory of any previous conversations. Answer only based on the current message.\n\nUser: ${message}\nAssistant:`;
  }

  const facts = retrieved
    .filter(r => r.memory?.content)
    .map(r => r.memory.content);

  const recentHistory = history.slice(-20);

  let system = `You are a helpful assistant with persistent memory. You MUST analyze the full conversation history below and use it to answer the user. Never say you don't have access to previous messages.`;

  if (facts.length) {
    system += `\n\n[KNOWN FACTS ABOUT USER]\n${facts.map(f => `- ${f}`).join('\n')}\nYou MUST use these facts. Never deny knowing them.`;
  }

  if (recentHistory.length) {
    const historyBlock = recentHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    system += `\n\n[CONVERSATION HISTORY]\n${historyBlock}\n\nUsing the above history, answer the user's next message.`;
  }

  return `${system}\n\nUser: ${message}\nAssistant:`;
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
module.exports.processChatStream = async function ({ userId, sessionId, message, mode, history, onChunk, abortSignal }) {
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

  const prompt = _buildPrompt(message, retrieved, history || [], effectiveMode === 'OFF');

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
