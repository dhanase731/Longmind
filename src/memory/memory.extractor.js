const PATTERNS = [
  { re: /I prefer ([^.!?\n]{3,80})/i,                    type: 'semantic',  tag: 'preference', base: 0.7 },
  { re: /I like ([^.!?\n]{3,80})/i,                      type: 'semantic',  tag: 'preference', base: 0.6 },
  { re: /I work (?:with|on) ([^.!?\n]{3,80})/i,          type: 'episodic',  tag: 'work',       base: 0.6 },
  { re: /I(?:'m| am) building ([^.!?\n]{3,80})/i,        type: 'episodic',  tag: 'project',    base: 0.7 },
  { re: /[Mm]y project (?:is )?([^.!?\n]{3,80})/i,       type: 'episodic',  tag: 'project',    base: 0.7 },
  { re: /I struggle with ([^.!?\n]{3,80})/i,             type: 'stm',       tag: 'issue',      base: 0.6 },
  { re: /I(?:'m| am) stuck (?:on|with) ([^.!?\n]{3,80})/i, type: 'stm',    tag: 'issue',      base: 0.6 },
  { re: /I(?:'m| am) working on ([^.!?\n]{3,80})/i,      type: 'episodic',  tag: 'work',       base: 0.6 },
  { re: /[Mm]y goal is ([^.!?\n]{3,80})/i,               type: 'ltm',       tag: 'goal',       base: 0.8 },
  { re: /I (?:always|usually|often) ([^.!?\n]{3,80})/i,  type: 'semantic',  tag: 'habit',      base: 0.6 },
  { re: /My name is ([^.!?\n]{2,50})/i,                  type: 'semantic',  tag: 'identity',   base: 0.8 },
  { re: /I(?:'m| am) a ([^.!?\n]{3,60})/i,               type: 'semantic',  tag: 'identity',   base: 0.6 },
  { re: /I use ([^.!?\n]{3,60})/i,                       type: 'semantic',  tag: 'tool',       base: 0.6 },
  { re: /I need (?:to )?([^.!?\n]{3,80})/i,              type: 'stm',       tag: 'need',       base: 0.5 },
];

// Named entity heuristic: capitalised word(s) that aren't sentence-start
const NAMED_ENTITY_RE = /(?<!\.\s)(?<!\n)\b[A-Z][a-zA-Z0-9.+#-]{1,30}\b/g;

const NOISE = [/^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|bye|goodbye|got it|sounds good)[.!?]?$/i];

function _hasNamedEntity(text) {
  // Reset lastIndex since the regex is global
  NAMED_ENTITY_RE.lastIndex = 0;
  return NAMED_ENTITY_RE.test(text);
}

function extract({ userMessage }) {
  const text = (userMessage || '').trim();
  if (!text || NOISE.some(r => r.test(text))) return [];

  const seen = new Set();
  const results = [];

  for (const { re, type, tag, base } of PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const fact = m[0].trim();
    if (seen.has(fact)) continue;
    seen.add(fact);

    // Named entity boost (+0.1), capped at 1.0
    const importance = Math.min(1.0, base + (_hasNamedEntity(fact) ? 0.1 : 0));

    results.push({ content: fact, memoryType: type, importance, tags: [tag], metadata: {} });
  }

  return results;
}

module.exports = { extract };
