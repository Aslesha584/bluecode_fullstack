import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
const router = Router(); router.use(requireAuth);
router.get('/status', (req, res) => res.json({ ai: { provider: 'openrouter', configured: Boolean(env.openRouterApiKey && !env.openRouterApiKey.startsWith('your_')), model: env.openRouterModel }, hunter: { provider: 'hunter', centrallyManaged: true, configured: Boolean(env.hunterApiKey && !env.hunterApiKey.startsWith('your_')) }, email: { configured: env.emailProvider !== 'not_configured' }, payments: { configured: false, note: 'Payment integration is intentionally not enabled in this starter.' } }));
export default router;
