const { GEMINI_API_KEY } = require('../config/env');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEN_MODEL = 'models/gemini-1.5-flash';
const EMBED_MODEL = 'models/gemini-embedding-001';

function deterministicEmbedding(text, dim = 768) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(text).digest();
  return Array.from({ length: dim }, (_, i) => ((hash[i % hash.length] / 255) * 2 - 1) * 0.5);
}

async function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _retry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === attempts - 1) throw e;
      await _sleep(200 * Math.pow(2, i));
    }
  }
}

async function embed(text) {
  if (!GEMINI_API_KEY) return deterministicEmbedding(text);
  return _retry(async () => {
    const res = await fetch(`${BASE}/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, content: { parts: [{ text }] } })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const values = data.embedding.values;
    if (values.length === 768) return values;
    const out = new Array(768).fill(0);
    for (let i = 0; i < Math.min(values.length, 768); i++) out[i] = values[i];
    return out;
  });
}

async function generate(prompt) {
  if (!GEMINI_API_KEY) return { text: `[[stub: ${prompt.slice(0, 80)}]]` };
  return _retry(async () => {
    const res = await fetch(`${BASE}/${GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { text: data.candidates[0].content.parts[0].text };
  });
}

async function stream(prompt, onChunk, options = {}) {
  if (!GEMINI_API_KEY) {
    const r = await generate(prompt);
    await onChunk(r.text);
    return;
  }
  const res = await fetch(`${BASE}/${GEN_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: options.signal
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    console.error('Gemini stream error:', msg);
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    if (options.signal?.aborted) throw new Error('aborted');
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const raw = line.slice(5).trim();
      if (raw === '[DONE]') return;
      try {
        const json = JSON.parse(raw);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) await onChunk(text);
      } catch (e) {}
    }
  }
}

module.exports = { embed, generate, stream };
