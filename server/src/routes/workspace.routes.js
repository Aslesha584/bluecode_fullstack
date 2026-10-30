import { Router } from 'express';
import Workspace from '../models/Workspace.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  let workspace = await Workspace.findOne({ ownerId: req.user._id });
  if (!workspace) workspace = await Workspace.create({ ownerId: req.user._id, state: {} });
  res.json({ state: workspace.state || {}, updatedAt: workspace.updatedAt, schemaVersion: workspace.schemaVersion });
}));

router.put('/', asyncHandler(async (req, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ error: 'A valid workspace state object is required.' });
  }
  const serialized = JSON.stringify(state);
  if (serialized.length > 2_000_000) return res.status(413).json({ error: 'Workspace data is too large.' });
  const workspace = await Workspace.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: { state, schemaVersion: 1 } },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ saved: true, updatedAt: workspace.updatedAt });
}));
export default router;
