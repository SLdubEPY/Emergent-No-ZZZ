import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
import { store } from './store.js';
import { BriefSchema, DeleteAccountSchema, IdSchema, LoginSchema, OperatorSchema, SignUpSchema } from './schemas.js';
import { authLimiter, globalLimiter, originGuard, requireCsrf, securityHeaders, session, setSessionCookie, writeLimiter } from './security.js';
import { destroyToken, hashPassword, newSession, passwordNeedsRehash, verifyPassword } from './auth.js';
import { csrfFor } from './crypto.js';
import { buildBlueprint, operatorReply } from './ai.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy ? 1 : false);
app.use((req, res, next) => { req.id = crypto.randomUUID(); res.setHeader('x-request-id', req.id); next(); });
app.use(pinoHttp({
  level: config.env === 'test' ? 'silent' : 'info',
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers.x-csrf-token', 'res.headers.set-cookie'],
  serializers: { req: req => ({ id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }) },
}));
app.use('/api', securityHeaders);
app.use('/api', originGuard);
app.use('/api', globalLimiter);
app.use('/api', express.json({ limit: '32kb', strict: true, type: 'application/json' }));
app.get('/api/health', (_req, res) => {
  try {
    if (!store.health()) throw new Error('Database health check failed');
    res.set('cache-control', 'no-store').json({ status: 'ok' });
  } catch {
    res.status(503).set('cache-control', 'no-store').json({ status: 'unavailable' });
  }
});
app.use('/api', cookieParser());
app.use('/api', session);
app.get('/api/v1/session', (req, res) => {
  const user = req.userId ? store.findUserById(req.userId) : null;
  res.set('cache-control', 'no-store').json({ csrfToken: req.csrfToken, expiresIn: 604800, user });
});
app.get('/api/v1/auth/me', (req, res) => {
  const user = req.userId ? store.findUserById(req.userId) : null;
  res.set('cache-control', 'no-store').json({ user });
});
app.post('/api/v1/auth/signup', authLimiter, requireCsrf, async (req, res) => {
  if (req.userId) return res.status(409).json({ error: { code: 'ALREADY_AUTHENTICATED', message: 'Sign out before creating another account.' } });
  const parsed = SignUpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Use a valid email, name, and password of 10+ characters with letters and numbers.' } });
  if (store.findUserByEmail(parsed.data.email)) return res.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'An account already exists for this email.' } });
  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try { user = store.createUser(parsed.data.email, parsed.data.name, passwordHash); }
  catch { return res.status(409).json({ error: { code: 'ACCOUNT_EXISTS', message: 'An account already exists for this email.' } }); }
  let active;
  try { active = newSession(user.id, req.sessionId); }
  catch (error) { store.deleteAccount(user.id); throw error; }
  destroyToken(req.sessionToken);
  setSessionCookie(res, active.token);
  res.status(201).set('cache-control', 'no-store').json({ user, csrfToken: csrfFor(active.token) });
});
app.post('/api/v1/auth/login', authLimiter, requireCsrf, async (req, res) => {
  if (req.userId) return res.status(409).json({ error: { code: 'ALREADY_AUTHENTICATED', message: 'Sign out before switching accounts.' } });
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
  const record = store.findUserByEmail(parsed.data.email);
  const valid = await verifyPassword(parsed.data.password, record?.password_hash);
  if (!record || !valid) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
  if (passwordNeedsRehash(record.password_hash)) store.updatePasswordHash(record.id, await hashPassword(parsed.data.password));
  // Create the replacement before revoking the current session so a storage failure
  // cannot strand the user or orphan anonymous work.
  const active = newSession(record.id, req.userId ? null : req.sessionId);
  destroyToken(req.sessionToken);
  setSessionCookie(res, active.token);
  const user = store.findUserById(record.id);
  res.set('cache-control', 'no-store').json({ user, csrfToken: csrfFor(active.token) });
});
app.post('/api/v1/auth/logout', writeLimiter, requireCsrf, (req, res) => {
  const active = newSession();
  destroyToken(req.sessionToken);
  setSessionCookie(res, active.token);
  res.set('cache-control', 'no-store').json({ csrfToken: csrfFor(active.token) });
});
app.get('/api/v1/auth/export', (req, res) => {
  if (!req.userId) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Log in to export account data.' } });
  const user = store.findUserById(req.userId);
  res.set({ 'cache-control': 'no-store', 'content-disposition': 'attachment; filename="nozzz-export.json"' }).json({ exportedAt: new Date().toISOString(), user, ventures: store.list(req.sessionId) });
});
app.delete('/api/v1/auth/account', authLimiter, requireCsrf, async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Log in to delete an account.' } });
  const parsed = DeleteAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'CONFIRMATION_REQUIRED', message: 'Enter your password and type DELETE.' } });
  const record = store.findUserByEmail(store.findUserById(req.userId)?.email || '');
  if (!record || !(await verifyPassword(parsed.data.password, record.password_hash))) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Password is incorrect.' } });
  store.deleteAccount(req.userId);
  const active = newSession();
  setSessionCookie(res, active.token);
  res.set('cache-control', 'no-store').json({ deleted: true, csrfToken: csrfFor(active.token) });
});
app.get('/api/v1/ventures', (req, res) => res.set('cache-control', 'no-store').json({ ventures: store.list(req.sessionId) }));

app.post('/api/v1/blueprints', writeLimiter, requireCsrf, async (req, res) => {
  const parsed = BriefSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Please check the venture brief.', fields: parsed.error.flatten().fieldErrors } });
  const blueprint = await buildBlueprint(parsed.data);
  res.set('cache-control', 'no-store').json({ blueprint });
});

app.post('/api/v1/ventures', writeLimiter, requireCsrf, async (req, res) => {
  const parsed = BriefSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Please check the venture brief.' } });
  const blueprint = await buildBlueprint(parsed.data);
  res.status(201).set('cache-control', 'no-store').json({ venture: store.create(req.sessionId, parsed.data, blueprint.score) });
});

app.post('/api/v1/operator', writeLimiter, requireCsrf, async (req, res) => {
  const parsed = OperatorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Enter a message between 2 and 1,000 characters.' } });
  const context = store.list(req.sessionId).slice(0, 5).map(v => ({ name: v.name, stage: v.stage, score: v.score }));
  const reply = await operatorReply(parsed.data.message, context);
  res.set('cache-control', 'no-store').json({ reply });
});

app.delete('/api/v1/ventures/:id', writeLimiter, requireCsrf, (req, res) => {
  const parsed = IdSchema.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid venture identifier.' } });
  if (!store.delete(req.sessionId, parsed.data)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Venture not found.' } });
  res.status(204).end();
});

app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }));

if (config.isProduction) {
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'], imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"], frameAncestors: ["'none'"], objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"],
    }},
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
  }));
  const dist = path.resolve('dist');
  app.use('/assets', express.static(path.join(dist, 'assets'), { index: false, etag: true, maxAge: '1y', immutable: true, dotfiles: 'deny' }));
  app.use(express.static(dist, { index: false, etag: true, maxAge: '1h', immutable: false, dotfiles: 'deny' }));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, _next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the 32 KB limit.' } });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON body.' } });
  req.log?.error({ err, requestId: req.id }, 'Unhandled request error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
});

export { app };
