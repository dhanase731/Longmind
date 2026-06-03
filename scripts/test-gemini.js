const adapter = require('../src/adapters/gemini.adapter');

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('GEMINI_API_KEY not set in environment. Set it and re-run.');
    process.exit(2);
  }

  try {
    console.log('Testing embed...');
    const emb = await adapter.embed('User prefers Node.js over Python');
    console.log('Embedding length:', Array.isArray(emb) ? emb.length : typeof emb);

    console.log('Testing generate...');
    const res = await adapter.generate('Summarize: Why would a developer prefer Node.js for backend work?');
    console.log('Generated text:', (res && res.text) ? res.text.slice(0, 500) : JSON.stringify(res));

    console.log('If you expected streaming test, run the app and call /chat/stream');
    process.exit(0);
  } catch (e) {
    console.error('Gemini test failed:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

run();
