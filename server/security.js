import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { csrfFor, safeEqual } from './crypto.js';
import { newSession, sessionFromToken } from './auth.js';
import { store } from './store.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: config.isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
});

const rateResponse = { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } };
export const globalLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: rateResponse });
export const writeLimiter = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: rateResponse });
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: rateResponse });

export function originGuard(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next(); // CLI/server-to-server requests; writes still require CSRF.
  let allowed = config.allowedOrigins.has(origin);
  try { allowed ||= new URL(origin).host === req.get('host'); } catch { allowed = false; }
  if (!allowed) return res.status(403).json({ error: { code: 'ORIGIN_DENIED', message: 'Origin is not allowed.' } });
  res.setHeader('Vary', 'Origin');
  next();
}

export function setSessionCookie(res, token) {
  res.cookie('nozzz_session', token, {
    httpOnly: true, secure: config.isProduction, sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60_000, path: '/api',
  });
}

export function session(req, res, next) {
  const token = req.cookies?.nozzz_session;
  let record = sessionFromToken(token);
  let activeToken = token;
  if (!record) {
    const created = newSession();
    activeToken = created.token;
    record = created;
    setSessionCookie(res, activeToken);
  }
  req.sessionToken = activeToken;
  req.sessionHash = record.tokenHash;
  req.sessionId = record.ownerId;
  req.userId = record.userId || null;
  req.csrfToken = csrfFor(activeToken);
  if (Math.random() < 0.01) store.cleanExpiredSessions();
  next();
}

export function requireCsrf(req, res, next) {
  if (safeEqual(req.get('x-csrf-token'), req.csrfToken)) return next();
  return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or expired.' } });
}
