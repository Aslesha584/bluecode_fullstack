import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  hunterApiKey: process.env.HUNTER_API_KEY || '',
  hunterApiBase: 'https://api.hunter.io/v2',
  emailProvider: process.env.EMAIL_PROVIDER || 'not_configured'
};

export function validateRequiredEnvironment() {
  const missing = [];
  if (!env.jwtSecret || env.jwtSecret.length < 32 || env.jwtSecret.startsWith('replace_')) missing.push('JWT_SECRET (use a random secret with at least 32 characters)');
  if (!env.mongoUri || env.mongoUri.includes('your_')) missing.push('MONGODB_URI');
  return missing;
}
