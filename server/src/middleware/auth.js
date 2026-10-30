import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    if (!env.jwtSecret || env.jwtSecret.length < 32) {
      return res.status(503).json({ error: 'Server authentication is not configured. Set JWT_SECRET.' });
    }
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.sub).select('_id name email role startupId');
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    next(error);
  }
}
