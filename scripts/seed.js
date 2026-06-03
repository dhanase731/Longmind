require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGODB_URI } = require('../src/config/env');

async function run() {
  console.log('Running seed script...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    const UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password_hash: String,
      default_memory_mode: { type: String, default: 'FULL' },
      created_at: { type: Date, default: Date.now }
    });
    const MemorySchema = new mongoose.Schema({
      user_id: mongoose.Schema.Types.ObjectId,
      memory_type: String,
      content: String,
      embedding: [Number],
      importance: { type: Number, default: 0.5 },
      tags: [String],
      metadata: mongoose.Schema.Types.Mixed,
      created_at: { type: Date, default: Date.now }
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Memory = mongoose.models.Memory || mongoose.model('Memory', MemorySchema);

    // Create indexes
    await User.createIndexes();
    await Memory.createIndexes();

    // Create or find demo user
    const email = 'demo@longmind.dev';
    const password = 'password123';
    let user = await User.findOne({ email });
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({ email, password_hash: hash });
      console.log('Demo user created:', email);
    } else {
      console.log('Demo user already exists:', email);
    }

    // Seed memories if none exist
    const count = await Memory.countDocuments({ user_id: user._id });
    if (count === 0) {
      await Memory.insertMany([
        { user_id: user._id, memory_type: 'semantic', content: 'User prefers Node.js over Python', importance: 0.7, tags: ['preference'] },
        { user_id: user._id, memory_type: 'episodic', content: 'User is building a REST API project', importance: 0.6, tags: ['project'] }
      ]);
      console.log('Seeded 2 sample memories');
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exit(1);
  }
}

run();
