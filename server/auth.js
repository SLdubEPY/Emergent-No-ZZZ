import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { store } from './store.js';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY = 'scrypt$32768$dummy-salt-for-timing-only$6ae3b8d08ff9504a';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$32768$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, encoded = DUMMY) {
  try {
    const [algorithm, n, salt, expected] = encoded.split('$');
    const cost = Number(n);
    if (algorithm !== 'scrypt' || ![16384, 32768].includes(cost) || !salt || !expected) {
      await scrypt(password, 'invalid-credential-padding', KEY_LENGTH, SCRYPT_OPTIONS);
      return false;
    }
    const derived = Buffer.from(await scrypt(password, salt, KEY_LENGTH, { N: cost, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
    const target = Buffer.from(expected, 'base64url');
    return derived.length === target.length && crypto.timingSafeEqual(derived, target);
  } catch { return false; }
}

export function passwordNeedsRehash(encoded) {
  return typeof encoded === 'string' && !encoded.startsWith('scrypt$32768$');
}

export function newSession(userId = null, previousOwner = null) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = store.createSession(tokenHash, userId, previousOwner);
  return { token, ...session };
}

export function sessionFromToken(token) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return store.findSession(tokenHash);
}

export function destroyToken(token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  store.deleteSession(tokenHash);
}
