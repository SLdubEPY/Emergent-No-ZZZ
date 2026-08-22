import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import request from 'supertest';
import { app } from './app.js';
import { store } from './store.js';
import { decryptJson, encryptJson } from './crypto.js';

const scrypt = promisify(crypto.scrypt);

test('authenticated encryption rejects tampered venture data', () => {
  const encrypted = encryptJson({ idea: 'confidential venture' });
  // Tamper the first character (the IV, always fully significant). Flipping
  // the last character would be unreliable: base64url leaves 4 padding bits
  // in the final character, so some changes leave the decoded byte identical.
  const tampered = (encrypted[0] === 'A' ? 'B' : 'A') + encrypted.slice(1);
  assert.throws(() => decryptJson(tampered));
  assert.deepEqual(decryptJson(encrypted), { idea: 'confidential venture' });
});

const validBrief = {
  idea: 'AI bookkeeping for independent designers',
  budget: 'Under $1,000',
  time: 'Under 5 hours',
  goal: '$5k MRR',
  autonomy: 'Approval required',
};

async function secureAgent() {
  const agent = request.agent(app);
  const session = await agent.get('/api/v1/session').expect(200);
  return { agent, csrf: session.body.csrfToken };
}

test('health check verifies storage without creating a user session', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.headers['set-cookie'], undefined);
});

test('health check reports unavailable when storage fails', async () => {
  const original = store.health;
  store.health = () => false;
  try {
    const response = await request(app).get('/api/health').expect(503);
    assert.equal(response.body.status, 'unavailable');
  } finally { store.health = original; }
});

test('same-host origin is allowed and marked with Vary: Origin', async () => {
  const response = await request(app).get('/api/v1/session').set('Host', 'nozzz.test').set('Origin', 'https://nozzz.test').expect(200);
  assert.match(response.headers.vary || '', /Origin/i);
});

test('origin with a different host is rejected even when the port matches', async () => {
  await request(app).get('/api/v1/session').set('Host', 'nozzz.test').set('Origin', 'https://evil.test').expect(403);
});

test('rejects oversized JSON with an accurate 413 response', async () => {
  const response = await request(app).post('/api/v1/operator').set('content-type', 'application/json').send(JSON.stringify({ message: 'x'.repeat(40_000) })).expect(413);
  assert.equal(response.body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('sets hardened headers and an HttpOnly strict session cookie', async () => {
  const response = await request(app).get('/api/v1/session').expect(200);
  assert.match(response.headers['content-security-policy'], /default-src 'none'/);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Strict/);
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('rejects cross-origin requests', async () => {
  await request(app).get('/api/v1/session').set('Origin', 'https://evil.example').expect(403);
});

test('rejects writes without a CSRF token', async () => {
  const { agent } = await secureAgent();
  await agent.post('/api/v1/ventures').send(validBrief).expect(403);
});

test('strictly validates and creates tenant-scoped encrypted ventures', async () => {
  const { agent, csrf } = await secureAgent();
  await agent.post('/api/v1/ventures').set('x-csrf-token', csrf).send({ ...validBrief, admin: true }).expect(422);
  const created = await agent.post('/api/v1/ventures').set('x-csrf-token', csrf).send(validBrief).expect(201);
  assert.equal(created.body.venture.name, validBrief.idea);
  const ownList = await agent.get('/api/v1/ventures').expect(200);
  assert.equal(ownList.body.ventures.length, 1);
  assert.equal(ownList.body.ventures[0].brief.goal, '$5k MRR');
  const other = await secureAgent();
  const otherList = await other.agent.get('/api/v1/ventures').expect(200);
  assert.equal(otherList.body.ventures.length, 0);
  await other.agent.delete(`/api/v1/ventures/${created.body.venture.id}`).set('x-csrf-token', other.csrf).expect(404);
  await agent.delete(`/api/v1/ventures/${created.body.venture.id}`).set('x-csrf-token', csrf).expect(204);
});

test('rejects malformed JSON bodies with a generic 400', async () => {
  const response = await request(app).post('/api/v1/operator').set('content-type', 'application/json').send('{bad json').expect(400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});

test('rejects malformed venture ids', async () => {
  const { agent, csrf } = await secureAgent();
  const response = await agent.delete('/api/v1/ventures/not-a-uuid').set('x-csrf-token', csrf).expect(400);
  assert.equal(response.body.error.code, 'INVALID_ID');
});

test('returns a JSON 404 for unknown API routes', async () => {
  const response = await request(app).get('/api/v1/unknown-endpoint').expect(404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('rejects script injection in venture briefs', async () => {
  const { agent, csrf } = await secureAgent();
  const response = await agent.post('/api/v1/ventures').set('x-csrf-token', csrf).send({ ...validBrief, idea: '<script>alert(1)</script>' }).expect(422);
  assert.equal(response.body.error.code, 'VALIDATION_FAILED');
});

test('requires authentication for account export', async () => {
  const { agent } = await secureAgent();
  const response = await agent.get('/api/v1/auth/export').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('rejects weak signup passwords', async () => {
  const { agent, csrf } = await secureAgent();
  await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: 'Weak', email: `weak-${Date.now()}@example.com`, password: 'short' }).expect(422);
});

test('rejects duplicate account registration from another session', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `dup-${Date.now()}@example.com`;
  await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: 'Dup', email, password: 'DupPassword2026' }).expect(201);
  const other = await secureAgent();
  const response = await other.agent.post('/api/v1/auth/signup').set('x-csrf-token', other.csrf).send({ name: 'Dup Two', email, password: 'DupPassword2026' }).expect(409);
  assert.equal(response.body.error.code, 'ACCOUNT_EXISTS');
});

test('parallel signups for one email create exactly one account', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `race-${Date.now()}@example.com`;
  const attempts = await Promise.all([1, 2, 3].map(i => agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: `Race ${i}`, email, password: 'RacePassword2026' })));
  const codes = attempts.map(r => r.status);
  assert.equal(codes.filter(c => c === 201).length, 1, 'exactly one signup succeeds');
  assert.equal(codes.filter(c => c === 409 || c === 403).length, 2, 'the rest are rejected');
  assert.ok(store.findUserByEmail(email), 'account exists exactly once');
});

test('supports secure account signup, session rotation, and logout', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `founder-${Date.now()}@example.com`;
  const signup = await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({
    name: 'Test Founder', email, password: 'StrongPassword2026',
  }).expect(201);
  assert.equal(signup.body.user.email, email);
  assert.equal(signup.body.user.password_hash, undefined);
  const me = await agent.get('/api/v1/auth/me').expect(200);
  assert.equal(me.body.user.name, 'Test Founder');
  await agent.post('/api/v1/auth/logout').set('x-csrf-token', signup.body.csrfToken).expect(200);
  const anonymous = await agent.get('/api/v1/auth/me').expect(200);
  assert.equal(anonymous.body.user, null);
});

test('session endpoint returns the authenticated user and CSRF token', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `session-${Date.now()}@example.com`;
  await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: 'Session Founder', email, password: 'SessionPassword2026' }).expect(201);
  const session = await agent.get('/api/v1/session').expect(200);
  assert.equal(session.body.user.email, email);
  assert.ok(session.body.csrfToken);
});

test('login upgrades a legacy scrypt work factor and rotates the session', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `legacy-${Date.now()}@example.com`;
  const password = 'LegacyPassword2026';
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = Buffer.from(await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }));
  const legacyHash = `scrypt$16384$${salt}$${derived.toString('base64url')}`;
  store.createUser(email, 'Legacy Founder', legacyHash);

  const login = await agent.post('/api/v1/auth/login').set('x-csrf-token', csrf).send({ email, password }).expect(200);
  assert.ok(login.body.user.email, email);
  assert.ok(login.body.csrfToken);
  const upgraded = store.findUserByEmail(email);
  assert.ok(upgraded.password_hash.startsWith('scrypt$32768$'), 'password hash upgraded to current work factor');
});

test('returns a generic error for invalid login credentials', async () => {
  const { agent, csrf } = await secureAgent();
  const response = await agent.post('/api/v1/auth/login').set('x-csrf-token', csrf).send({
    email: 'nobody@example.com', password: 'not-the-password',
  }).expect(401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('generates bounded operator guidance without requiring a vendor key', async () => {
  const { agent, csrf } = await secureAgent();
  const response = await agent.post('/api/v1/operator').set('x-csrf-token', csrf).send({
    message: 'Pressure-test a niche analytics service',
  }).expect(200);
  assert.ok(response.body.reply.text.length > 30);
  assert.ok(response.body.reply.text.length <= 1800);
  assert.equal(response.body.reply.source, 'venture-engine');
});

test('prevents authenticated account switching and cross-account venture transfer', async () => {
  const { agent, csrf } = await secureAgent();
  const firstEmail = `first-${Date.now()}@example.com`;
  const signup = await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: 'First Owner', email: firstEmail, password: 'FirstPassword2026' }).expect(201);
  await agent.post('/api/v1/ventures').set('x-csrf-token', signup.body.csrfToken).send(validBrief).expect(201);
  const attempt = await agent.post('/api/v1/auth/login').set('x-csrf-token', signup.body.csrfToken).send({ email: 'other@example.com', password: 'OtherPassword2026' }).expect(409);
  assert.equal(attempt.body.error.code, 'ALREADY_AUTHENTICATED');
  const retained = await agent.get('/api/v1/ventures').expect(200);
  assert.equal(retained.body.ventures.length, 1);
});

test('exports and permanently deletes account data after password confirmation', async () => {
  const { agent, csrf } = await secureAgent();
  const email = `delete-${Date.now()}@example.com`;
  const password = 'DeletePassword2026';
  const signup = await agent.post('/api/v1/auth/signup').set('x-csrf-token', csrf).send({ name: 'Delete Me', email, password }).expect(201);
  const exported = await agent.get('/api/v1/auth/export').expect(200);
  assert.equal(exported.body.user.email, email);
  const deleted = await agent.delete('/api/v1/auth/account').set('x-csrf-token', signup.body.csrfToken).send({ password, confirmation: 'DELETE' }).expect(200);
  assert.equal(deleted.body.deleted, true);
  const me = await agent.get('/api/v1/auth/me').expect(200);
  assert.equal(me.body.user, null);
});
