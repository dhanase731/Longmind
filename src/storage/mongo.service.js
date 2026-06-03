const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

let connected = false;

async function connect() {
  if (connected) return;
  try {
    await mongoose.connect(MONGODB_URI);
    connected = true;
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    throw e;
  }
}

// Define schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  default_memory_mode: { type: String, default: 'FULL' },
  created_at: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  memory_mode: { type: String, default: 'FULL' },
  created_at: { type: Date, default: Date.now }
});

const MemorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  source_type: { type: String, enum: ['user', 'assistant', 'system'] },
  memory_type: { type: String, enum: ['stm', 'ltm', 'episodic', 'semantic'], required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  confidence: { type: Number, default: 0.8 },
  importance: { type: Number, default: 0.5 },
  tags: { type: [String], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, default: null }
});

// Indexes
MemorySchema.index({ user_id: 1, memory_type: 1, created_at: -1 });
MemorySchema.index({ user_id: 1, created_at: -1 });
MemorySchema.index({ expires_at: 1 });

const User = mongoose.model('User', UserSchema);
const Session = mongoose.model('Session', SessionSchema);
const Memory = mongoose.model('Memory', MemorySchema);

module.exports = { connect, User, Session, Memory, mongoose };
