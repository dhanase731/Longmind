const Groq = require('groq-sdk');

const GEN_MODEL = 'llama-3.1-8b-instant';

let _groq;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

function deterministicEmbedding(text, dim = 768) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(text).digest();
  return Array.from({ length: dim }, (_, i) => ((hash[i % hash.length] / 255) * 2 - 1) * 0.5);
}

async function embed(text) {
  return deterministicEmbedding(text);
}

async function generate(prompt) {
  if (!process.env.GROQ_API_KEY) return { text: `[[stub: ${prompt.slice(0, 80)}]]` };
  try {
    const res = await getGroq().chat.completions.create({
      model: GEN_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });
    return { text: res.choices[0].message.content };
  } catch (e) {
    console.error('Groq generate error:', e.message);
    throw e;
  }
}

async function stream(prompt, onChunk, options = {}) {
  if (!process.env.GROQ_API_KEY) {
    const r = await generate(prompt);
    await onChunk(r.text);
    return;
  }
  try {
    const res = await getGroq().chat.completions.create({
      model: GEN_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
    for await (const chunk of res) {
      if (options.signal?.aborted) throw new Error('aborted');
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) await onChunk(text);
    }
  } catch (e) {
    if (e.message === 'aborted') throw e;
    console.error('Groq stream error:', e.message);
    throw e;
  }
}

module.exports = { embed, generate, stream };
