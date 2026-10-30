import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireAuth);

function ensureKey(res) {
  if (!env.hunterApiKey || env.hunterApiKey.startsWith('your_')) { res.status(503).json({ error: 'Hunter is not configured. Add HUNTER_API_KEY to server/.env.' }); return false; }
  return true;
}
async function hunterFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.errors?.map(e => e.details || e.id).filter(Boolean).join('; ') || `Hunter API returned ${response.status}.`;
    const error = new Error(message); error.status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502; throw error;
  }
  return data;
}

// Discover matching companies. Hunter documents this as a free endpoint, but access is account/plan dependent.
router.post('/discover', async (req, res, next) => {
  try { if (!ensureKey(res)) return;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!String(body.query || '').trim() && !body.industry && !body.headcount && !body.organization && !body.keywords && !body.headquarters_location) return res.status(400).json({ error: 'Provide a company search query or at least one supported Hunter filter.' });
    const response = await hunterFetch(`${env.hunterApiBase}/discover?api_key=${encodeURIComponent(env.hunterApiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ ...body, limit: Math.min(20, Math.max(1, Number(body.limit) || 10)) }) });
    res.json({ companies: response.data || [], meta: response.meta || {}, provider: 'hunter' });
  } catch (error) { next(error); }
});

router.get('/domain-search', async (req, res, next) => {
  try { if (!ensureKey(res)) return; const domain = String(req.query.domain || '').trim(); if (!domain) return res.status(400).json({ error: 'domain is required.' });
    const url = new URL(`${env.hunterApiBase}/domain-search`); url.searchParams.set('domain', domain); url.searchParams.set('api_key', env.hunterApiKey); if (req.query.limit) url.searchParams.set('limit', String(Math.min(100, Math.max(1, Number(req.query.limit) || 10))));
    const data = await hunterFetch(url); res.json({ ...data, provider: 'hunter' });
  } catch (error) { next(error); }
});

router.get('/email-finder', async (req, res, next) => {
  try { if (!ensureKey(res)) return; const domain = String(req.query.domain || '').trim(); const firstName = String(req.query.first_name || '').trim(); const lastName = String(req.query.last_name || '').trim();
    if ((!domain && !req.query.company) || !firstName || !lastName) return res.status(400).json({ error: 'Provide first_name, last_name, and either domain or company.' });
    const url = new URL(`${env.hunterApiBase}/email-finder`); for (const key of ['domain','company','first_name','last_name']) if (req.query[key]) url.searchParams.set(key, String(req.query[key])); url.searchParams.set('api_key', env.hunterApiKey);
    const data = await hunterFetch(url); res.json({ ...data, provider: 'hunter' });
  } catch (error) { next(error); }
});

router.get('/company-enrichment', async (req, res, next) => {
  try { if (!ensureKey(res)) return; const domain = String(req.query.domain || '').trim(); const name = String(req.query.name || '').trim(); if (!domain && !name) return res.status(400).json({ error: 'Provide domain or name.' });
    const url = new URL(`${env.hunterApiBase}/enrichment`); if (domain) url.searchParams.set('domain', domain); if (name) url.searchParams.set('company', name); url.searchParams.set('api_key', env.hunterApiKey);
    const data = await hunterFetch(url); res.json({ ...data, provider: 'hunter' });
  } catch (error) { next(error); }
});
export default router;
