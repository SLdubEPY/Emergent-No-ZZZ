import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(8787),
  SESSION_SECRET: z.string().min(32).optional(),
  DATA_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  AI_BASE_URL: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  AI_API_KEY: z.preprocess(v => v === '' ? undefined : v, z.string().min(10).optional()),
  AI_MODEL: z.string().max(100).default('gpt-4o-mini'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid server configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
if (env.NODE_ENV === 'production' && (!env.SESSION_SECRET || !env.DATA_ENCRYPTION_KEY)) {
  console.error('Production requires SESSION_SECRET (32+ chars) and DATA_ENCRYPTION_KEY (64 hex chars).');
  process.exit(1);
}
if (Boolean(env.AI_BASE_URL) !== Boolean(env.AI_API_KEY)) {
  console.error('AI_BASE_URL and AI_API_KEY must be configured together.');
  process.exit(1);
}
if (env.AI_BASE_URL) {
  const aiUrl = new URL(env.AI_BASE_URL);
  if (aiUrl.username || aiUrl.password || (env.NODE_ENV === 'production' && aiUrl.protocol !== 'https:')) {
    console.error('AI_BASE_URL must not contain credentials and must use HTTPS in production.');
    process.exit(1);
  }
}
const allowedOriginList = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
for (const origin of allowedOriginList) {
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin !== origin.replace(/\/$/, '') || (env.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:')) throw new Error();
  } catch {
    console.error(`Invalid allowed origin: ${origin}`);
    process.exit(1);
  }
}

// Development-only ephemeral secrets. Production is fail-closed above.
const ephemeralSessionSecret = crypto.randomBytes(48).toString('base64url');
const ephemeralDataKey = crypto.randomBytes(32);

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  sessionSecret: env.SESSION_SECRET || ephemeralSessionSecret,
  encryptionKey: env.DATA_ENCRYPTION_KEY ? Buffer.from(env.DATA_ENCRYPTION_KEY, 'hex') : ephemeralDataKey,
  persistentStorage: Boolean(env.DATA_ENCRYPTION_KEY),
  allowedOrigins: new Set(allowedOriginList.map(origin => origin.replace(/\/$/, ''))),
  trustProxy: env.TRUST_PROXY === 'true',
  ai: env.AI_BASE_URL && env.AI_API_KEY ? { baseUrl: env.AI_BASE_URL.replace(/\/$/, ''), apiKey: env.AI_API_KEY, model: env.AI_MODEL } : null,
});
