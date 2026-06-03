# LongMind — Universal Memory Infrastructure

**LongMind** is a production-quality MVP for AI memory orchestration. It provides LLMs with persistent memory, explainable retrieval, governed recall, contextual continuity, and time-aware memory handling.

---

## Core Product

LongMind is **NOT** a chatbot. It is an AI memory infrastructure platform that gives LLMs:

- **Persistent memory** across sessions
- **Explainable retrieval** with semantic, recency, and importance scoring
- **Governed recall** with fine-grained control (OFF, SESSION, EPISODIC, SEMANTIC, FULL, INCOGNITO)
- **Contextual continuity** with time-aware memory decay
- **Memory orchestration** as cognition middleware

---

## Tech Stack

### Backend
- Node.js + Express
- MongoDB with Mongoose
- Redis (Upstash)
- Gemini API (text-embedding-004 + gemini-1.5-flash)
- JWT authentication

### Frontend
- React + Vite
- TailwindCSS
- Server-Sent Events (SSE) streaming

### Deployment
- Backend: Railway
- Frontend: Vercel
- Database: MongoDB Atlas
- Cache: Upstash Redis

---

## Local Setup

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis OR Upstash Redis account
- Gemini API key

### 2. Clone and Install

```bash
git clone <your-repo>
cd Longmind

# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Environment Variables

Create `.env` in project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/longmind
REDIS_URL=rediss://default:password@host:port
JWT_SECRET=your_random_secret_here
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

### 4. Initialize Database

```bash
npm run seed
```

This will:
- Connect to MongoDB and create collections
- Create indexes for optimized queries
- Create a demo user: `demo@longmind.dev` / `password123`
- Seed 2 sample memories

### 5. Run Locally

Terminal 1 (Backend):
```bash
npm start
# or for dev mode with auto-reload:
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Access at: http://localhost:5173

---

## Deployment

### Backend (Railway)

1. Create a new project on Railway
2. Deploy from GitHub
3. Add environment variables:
   - `GEMINI_API_KEY`
   - `MONGODB_URI` (from MongoDB Atlas)
   - `REDIS_URL` (from Upstash)
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Vercel domain)
4. Run seed script once: `npm run seed`

### Frontend (Vercel)

1. Import project from GitHub
2. Root directory: `frontend`
3. Framework preset: Vite
4. Add environment variable:
   - `VITE_API_URL` = your Railway backend URL
5. Deploy

---

## Architecture

### Memory Pipeline

```
User Message
  → Governance Check (mode enforcement)
  → Retrieval Engine (pgvector cosine similarity)
  → Temporal Scoring (recency decay)
  → Context Compression (token budget)
  → Prompt Assembly
  → Gemini API
  → Response Generation
  → Memory Extraction (rule-based)
  → Storage (PostgreSQL + Redis cache)
  → Return with explainability
```

### Memory Types

All memory types are **metadata** — stored in one unified table:

- `stm` — Short-term (cached in Redis for 24h)
- `episodic` — Event-based memories
- `semantic` — Factual knowledge
- `ltm` — Long-term persistent memories

### Governance Modes

- `OFF` — No retrieval or storage
- `SESSION` — Redis STM only (no persistence)
- `EPISODIC` — Episodic + STM only
- `SEMANTIC` — Semantic + STM only
- `FULL` — All memory types active
- `INCOGNITO` — Runtime only (no persistence)

---

## API Reference

Swagger docs available at: `http://localhost:3000/api-docs`

### Key Endpoints

#### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Get JWT token

#### Chat
- `POST /chat` — Send message (returns full response)
- `POST /chat/stream` — Stream response via SSE
- `POST /chat/stop` — Stop active generation

#### Memories
- `GET /memories` — List memories (with optional type filter)
- `DELETE /memories/:id` — Delete specific memory
- `DELETE /memories/session/:sessionId` — Clear session
- `DELETE /memories/all` — Clear all user memories

#### Governance
- `GET /governance/mode` — Get current mode
- `POST /governance/mode` — Set governance mode

---

## Demo Script

### Step 1: Initial Setup
1. Login with `demo@longmind.dev` / `password123`
2. Navigate to Chat page
3. Ensure mode is set to `FULL`

### Step 2: Store Memory
Send message:
```
I prefer Node.js over Python for backend development.
```

Watch:
- Message sent
- AI responds acknowledging preference
- Memory extracted and stored

### Step 3: Recall Memory
Start new session or refresh page.

Send message:
```
What technologies do I prefer?
```

Watch:
- Memory Inspector shows retrieved memory
- Semantic score: ~0.9+
- Recency score: ~0.8+
- Importance score: 0.7
- AI responds: "You prefer Node.js over Python for backend development"

### Step 4: Governance Control
1. Toggle mode to `OFF`
2. Ask again: "What technologies do I prefer?"
3. AI does NOT recall memory — responds generically

### Step 5: Explainability
Open Memory Inspector:
- See retrieved memories
- View semantic, recency, importance, final scores
- Read retrieval reason
- See memory type and timestamp

### Step 6: Memory Management
Go to Memories page:
- View all stored memories
- Filter by type (stm, episodic, semantic, ltm)
- Delete individual memories
- See importance scores and timestamps

### Step 7: Settings
Go to Settings:
- Change governance mode
- Clear current session
- Clear all memories

---

## Memory Scoring

### Formula

```
final = (0.6 × semantic) + (0.25 × recency) + (0.15 × importance)
```

### Recency Decay

```
recency = exp(-0.01 × hours_since_creation)
```

### Importance Rules

Base importance: **0.5**

Boosters:
- Preference indicators (`I prefer`, `I like`): **+0.2**
- Named entities: **+0.1**
- Goals (`My goal is`): **base 0.8**

---

## Memory Extraction Rules

Patterns matched:
- `I prefer ...`
- `I like ...`
- `I work with/on ...`
- `I'm building ...`
- `My project is ...`
- `I struggle with ...`
- `My goal is ...`

Noise filtered:
- Greetings (`hi`, `hello`, `hey`)
- Acknowledgments (`thanks`, `ok`, `yes`)

---

## Background Janitor

Runs every 60 minutes:

1. **TTL cleanup** — Delete expired memories
2. **Stale decay** — Reduce importance of very old memories (180+ days)
3. **Deduplication** — Remove duplicate memories within 24h window

---

## Security

- Helmet middleware
- CORS configuration
- Rate limiting (100 req/15min general, 20 req/15min auth)
- JWT authentication
- User-scoped memory queries (enforced at DB level)
- Input validation
- Secure environment variable management

---

## Monitoring

Health endpoint: `GET /health`

Returns:
```json
{
  "status": "ok",
  "services": {
    "postgres": true,
    "redis": true
  }
}
```

---

## Development

### Scripts

```bash
npm start          # Start backend
npm run dev        # Start backend with auto-reload
npm run seed       # Initialize database
npm test           # Run tests (not implemented)
```

### Database Migrations

Currently using seed script for schema initialization. For production, use a migration tool like `node-pg-migrate` or `knex`.

---

## Troubleshooting

### MongoDB connection fails
- Verify `MONGODB_URI` format: `mongodb+srv://...`
- Ensure IP whitelist on Atlas allows your IP (or `0.0.0.0/0` for dev)

### `pgvector` extension not found
No longer applicable — pgvector has been replaced by MongoDB with JS cosine similarity.

### Redis connection fails
Verify `REDIS_URL` format:
- Railway: `redis://...`
- Upstash: `rediss://...` (note the double 's')

### Gemini API errors
- Check API key is valid
- Ensure billing is enabled on Google AI Studio
- Model fallback: if embedding fails, uses deterministic hash-based embeddings

### Frontend can't reach backend
- Verify `VITE_API_URL` in frontend `.env`
- Check CORS configuration in backend (should allow `FRONTEND_URL`)
- Ensure backend is running on expected port

---

## Known Limitations (MVP Scope)

- No graph cognition or multi-hop reasoning
- No autonomous agents
- Rule-based memory extraction (no LLM-based extraction)
- Simple temporal decay (exponential only)
- No distributed architecture
- No memory merge/conflict resolution
- No memory versioning

---

## Future Enhancements (Post-MVP)

- LLM-based memory extraction
- Memory consolidation (merge similar memories)
- Hierarchical memory organization
- Cross-user memory sharing (with privacy controls)
- Memory analytics dashboard
- Webhook support for real-time memory sync
- Multi-modal memory (images, audio)

---

## License

MIT

---

## Credits

Built as a hackathon MVP demonstrating production-quality AI memory orchestration infrastructure.
