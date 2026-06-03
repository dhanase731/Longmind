function approxTokens(text) {
  return Math.ceil(text.length / 4);
}

function pack(retrievedItems = [], budgetTokens = 3000) {
  let used = 0;
  const parts = [];
  for (const item of retrievedItems) {
    let content = item.memory.content || '';
    let tokens = approxTokens(content);
    if (tokens > 200) {
      content = content.slice(0, 800) + '...';
      tokens = 200;
    }
    if (used + tokens > budgetTokens) break;
    parts.push(`- ${content}`);
    used += tokens;
  }
  return parts.join('\n');
}

module.exports = { pack, approxTokens };
