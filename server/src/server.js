import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env, validateRequiredEnvironment } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import aiRoutes from './routes/ai.routes.js';
import emailRoutes from './routes/email.routes.js';
import hunterRoutes from './routes/hunter.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin.split(',').map(value => value.trim()), credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'blue-code-os-api', time: new Date().toISOString() }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), aiRoutes);
app.use('/api/hunter', rateLimit({ windowMs: 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false }), hunterRoutes);
app.use('/api/email', emailRoutes);

app.use((req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status) || 500;
  if (env.nodeEnv !== 'production') console.error(error);
  res.status(status).json({ error: status >= 500 && env.nodeEnv === 'production' ? 'An unexpected server error occurred.' : (error.message || 'Unexpected server error.') });
});

async function start() {
  const missing = validateRequiredEnvironment();
  if (missing.length) {
    console.error('\nMissing/invalid server environment configuration:');
    missing.forEach(item => console.error(` - ${item}`));
    console.error('\nCopy server/.env.example to server/.env, set the required values, then start again.\n');
    process.exit(1);
  }
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB.');
  app.listen(env.port, () => console.log(`Blue Code - OS API listening on http://localhost:${env.port}`));
}

start().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
