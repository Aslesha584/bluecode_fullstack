import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const publicUser = user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role });
function issueToken(user) {
  if (!env.jwtSecret || env.jwtSecret.length < 32 || env.jwtSecret.startsWith('replace_')) {
    const error = new Error('Server authentication is not configured. Set JWT_SECRET in server/.env.');
    error.status = 503;
    throw error;
  }
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

router.post('/register', asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (name.length < 2) return res.status(400).json({ error: 'Enter your full name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  await Workspace.create({ ownerId: user._id, state: {} });
  return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  return res.json({ token: issueToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;
