import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireAuth);
router.get('/status', (req, res) => res.json({ configured: env.emailProvider !== 'not_configured', provider: env.emailProvider, note: 'Choose an approved transactional/outreach provider with sending and reply-event support before enabling this workflow.' }));
router.post('/send', (req, res) => res.status(503).json({ error: 'Email sending is not configured. Select and configure an approved provider first; no email was sent.' }));
router.post('/reply-events', (req, res) => res.status(501).json({ error: 'Reply-event webhook validation is not configured. No reply state was changed.' }));
export default router;
