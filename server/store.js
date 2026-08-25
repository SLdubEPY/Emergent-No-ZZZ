import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { decryptJson, encryptJson } from './crypto.js';

if (config.persistentStorage) fs.mkdirSync(path.resolve('data'), { recursive: true, mode: 0o700 });
const databasePath = config.persistentStorage ? path.resolve('data/nozzz.db') : ':memory:';
const db = new DatabaseSync(databasePath);
if (config.persistentStorage) fs.chmodSync(databasePath, 0o600);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA secure_delete = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS ventures (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    encrypted_brief TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Blueprint ready',
    progress INTEGER NOT NULL DEFAULT 18 CHECK(progress BETWEEN 0 AND 100),
    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
    created_at TEXT NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS ventures_owner_created ON ventures(owner_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT;
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    user_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  ) STRICT;
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
`);

const schemaVersion = db.prepare('PRAGMA user_version').get().user_version;
if (schemaVersion < 1) {
  db.exec(`
    BEGIN IMMEDIATE;
    UPDATE ventures SET name = 'Encrypted venture' WHERE name <> 'Encrypted venture';
    PRAGMA user_version = 1;
    COMMIT;
  `);
}

const insert = db.prepare(`INSERT INTO ventures
  (id, owner_id, name, encrypted_brief, stage, progress, score, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const list = db.prepare(`SELECT id, name, encrypted_brief, stage, progress, score, created_at
  FROM ventures WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50`);
const remove = db.prepare('DELETE FROM ventures WHERE id = ? AND owner_id = ?');
const insertUser = db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)');
const findUserEmail = db.prepare('SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?');
const findUserId = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const insertSession = db.prepare('INSERT INTO sessions (token_hash, owner_id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)');
const findSession = db.prepare('SELECT token_hash, owner_id, user_id, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?');
const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const cleanSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
const cleanGuestOrphans = db.prepare(`DELETE FROM ventures WHERE owner_id LIKE 'guest:%' AND owner_id NOT IN (SELECT owner_id FROM sessions)`);
const revokeOtherSessions = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?');
const transferVentures = db.prepare('UPDATE ventures SET owner_id = ? WHERE owner_id = ?');
const deleteUserVentures = db.prepare('DELETE FROM ventures WHERE owner_id = ?');
const deleteUserSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?');
const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const healthCheck = db.prepare('SELECT 1 AS ok');

function publicVenture(row) {
  const brief = decryptJson(row.encrypted_brief);
  return { id: row.id, name: brief.idea, stage: row.stage, progress: row.progress, score: row.score, created: row.created_at, brief };
}

export const store = {
  health() { return healthCheck.get()?.ok === 1; },
  create(ownerId, brief, score) {
    const record = { id: crypto.randomUUID(), name: brief.idea, stage: 'Blueprint ready', progress: 18, score, created: new Date().toISOString() };
    insert.run(record.id, ownerId, 'Encrypted venture', encryptJson(brief), record.stage, record.progress, score, record.created);
    return { ...record, brief };
  },
  list(ownerId) { return list.all(ownerId).map(publicVenture); },
  delete(ownerId, id) { return remove.run(id, ownerId).changes === 1; },
  createUser(email, name, passwordHash) {
    const user = { id: crypto.randomUUID(), email, name, created: new Date().toISOString() };
    insertUser.run(user.id, email, name, passwordHash, user.created);
    return user;
  },
  findUserByEmail(email) { return findUserEmail.get(email) || null; },
  findUserById(id) { return findUserId.get(id) || null; },
  updatePasswordHash(id, passwordHash) { return updatePassword.run(passwordHash, id).changes === 1; },
  createSession(tokenHash, userId = null, previousOwner = null) {
    const ownerId = userId ? `user:${userId}` : `guest:${crypto.randomUUID()}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      insertSession.run(tokenHash, ownerId, userId, expires, now.toISOString());
      if (previousOwner && previousOwner !== ownerId) transferVentures.run(ownerId, previousOwner);
      db.exec('COMMIT');
      return { tokenHash, ownerId, userId, expiresAt: expires };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
  findSession(tokenHash) {
    const row = findSession.get(tokenHash, new Date().toISOString());
    return row ? { tokenHash: row.token_hash, ownerId: row.owner_id, userId: row.user_id, expiresAt: row.expires_at } : null;
  },
  deleteSession(tokenHash) { deleteSession.run(tokenHash); },
  cleanExpiredSessions() {
    db.exec('BEGIN IMMEDIATE');
    try {
      const expired = cleanSessions.run(new Date().toISOString()).changes;
      // Guest workspaces are keyed to their session; once that session is gone
      // (logout or expiry) the encrypted ventures are unreachable, so remove them.
      const orphans = cleanGuestOrphans.run().changes;
      db.exec('COMMIT');
      return { expired, orphans };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
  revokeOtherSessions(userId, keepTokenHash) { return revokeOtherSessions.run(userId, keepTokenHash).changes; },
  deleteAccount(userId) {
    const ownerId = `user:${userId}`;
    db.exec('BEGIN IMMEDIATE');
    try {
      deleteUserVentures.run(ownerId);
      deleteUserSessions.run(userId);
      const deleted = deleteUser.run(userId).changes === 1;
      db.exec('COMMIT');
      return deleted;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
