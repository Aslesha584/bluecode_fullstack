import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
const router = Router(); router.use(requireAuth);

async function askAI(messages, maxTokens = 900) {
  if (!env.openRouterApiKey || env.openRouterApiKey.startsWith('your_')) { const e = new Error('OpenRouter is not configured. Add OPENROUTER_API_KEY to server/.env.'); e.status = 503; throw e; }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${env.openRouterApiKey}`, 'HTTP-Referer': 'https://bluecode-os.com', 'X-Title': 'Blue Code - OS' }, body: JSON.stringify({ model: env.openRouterModel, messages, max_tokens: maxTokens, temperature: 0.2 }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const e = new Error(data?.error?.message || `OpenRouter returned ${response.status}.`); e.status = response.status === 429 ? 429 : 502; throw e; }
  return String(data.choices?.[0]?.message?.content || '').trim();
}
function parseJSON(text) { const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); return JSON.parse(cleaned); }

router.post('/draft-email', async (req, res, next) => { try { const { founderName, startup, prospect, objective } = req.body || {}; if (!prospect?.company && !prospect?.companyName) return res.status(400).json({ error: 'Prospect company is required.' }); const company = prospect.company || prospect.companyName; const content = await askAI([{ role: 'system', content: 'Write truthful, concise B2B outreach. Never invent facts. Return only JSON with subject and body.' }, { role: 'user', content: JSON.stringify({ founderName, startup, prospect, objective: objective || 'Request a short discovery conversation', company }) }], 700); let result; try { result = parseJSON(content); } catch { result = { subject: `A question for ${company}`, body: content }; } res.json({ subject: String(result.subject || `A question for ${company}`), body: String(result.body || content), provider: 'openrouter', model: env.openRouterModel }); } catch (e) { next(e); } });

router.post('/classify-reply', async (req, res, next) => { try { const reply = String(req.body?.reply || '').trim(); if (!reply) return res.status(400).json({ error: 'Reply text is required.' }); const content = await askAI([{ role: 'system', content: 'Classify a B2B sales reply as exactly positive, neutral, or negative. Return only JSON: {"intent":"positive|neutral|negative","reason":"short reason"}.' }, { role: 'user', content: reply }], 160); const result = parseJSON(content); const intent = String(result.intent || '').toLowerCase(); if (!['positive','neutral','negative'].includes(intent)) return res.status(502).json({ error: 'AI returned an invalid reply classification.' }); res.json({ intent, reason: String(result.reason || ''), provider: 'openrouter', model: env.openRouterModel }); } catch (e) { next(e); } });

router.post('/evaluate-prospect', async (req, res, next) => { try { const { icp = {}, company = {}, evidence = [] } = req.body || {}; if (!company.name && !company.companyName && !company.domain) return res.status(400).json({ error: 'Company name or domain is required.' }); const content = await askAI([{ role: 'system', content: 'You evaluate B2B company fit only from supplied evidence. Do not invent facts. If evidence is missing, use status unknown and confidence 0. Return only valid JSON with keys: icpMatch (0-100), trigger {status,description,evidenceUrl,confidence}, mainSignal {status,description,evidenceUrl,confidence}, intake {status,description,evidenceUrl,confidence}, rationale, evidenceGaps. Status must be supported, weak, or unknown. A signal description must not state unsupported facts.' }, { role: 'user', content: JSON.stringify({ icp, company, evidence }) }], 900); const result = parseJSON(content); const clamp = n => Math.max(0, Math.min(100, Number(n) || 0)); const icpPoints = Math.round(clamp(result.icpMatch) * 0.4); const signalPoints = (s, max) => { const status = s?.status; if (status === 'unknown') return 0; const confidence = Math.max(0, Math.min(1, Number(s?.confidence) || 0)); const factor = status === 'supported' ? 1 : 0.5; return Math.round(max * confidence * factor); }; const triggerPoints = signalPoints(result.trigger, 20); const mainSignalPoints = signalPoints(result.mainSignal, 25); const intakePoints = signalPoints(result.intake, 15); const score = Math.max(0, Math.min(100, icpPoints + triggerPoints + mainSignalPoints + intakePoints)); res.json({ ...result, score, scoreBreakdown: { icpMatch: icpPoints, trigger: triggerPoints, mainSignal: mainSignalPoints, intake: intakePoints }, provider: 'openrouter', model: env.openRouterModel, evaluatedAt: new Date().toISOString() }); } catch (e) { next(e); } });

router.post('/draft-response', async (req, res, next) => {
  try {
    const {
      reply,
      intent,
      founderName,
      startup,
      prospect,
      bookingUrl
    } = req.body || {};

    if (!String(reply || '').trim()) {
      return res.status(400).json({
        error: 'Incoming reply text is required.'
      });
    }

    const content = await askAI([
      {
        role: 'system',
        content: `You are an assistant helping a startup founder respond
to an incoming B2B sales email.

Write a natural, concise, professional reply that directly addresses
the sender's message.
- Never invent facts, promises, prices, or product capabilities.
- For positive replies, suggest a sensible next step.
- For neutral replies, answer politely and clarify their needs.
- For negative replies, respect their decision and avoid pressure.
- Use a booking link only if one is provided.
- Return only valid JSON with "subject" and "body" fields.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          founderName,
          startup,
          prospect,
          incomingReply: reply,
          classifiedIntent: intent,
          bookingUrl: bookingUrl || null
        })
      }
    ], 500);

    let result;

    try {
      result = parseJSON(content);
    } catch {
      result = {
        subject: 'Re: Your message',
        body: content
      };
    }

    res.json({
      subject: String(result.subject || 'Re: Your message'),
      body: String(result.body || content),
      provider: 'openrouter',
      model: env.openRouterModel
    });
  } catch (e) {
    next(e);
  }
});

export default router;
