const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../storage/mongo.service');
const { JWT_SECRET } = require('../config/env');

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash: hash });
    res.json({ user: { id: user._id, email: user.email } });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'email already registered' });
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (e) {
    next(e);
  }
}

module.exports = { register, login };
