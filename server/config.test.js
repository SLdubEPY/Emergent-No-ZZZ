import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function loadConfig(overrides) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "import './server/config.js'"], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...overrides },
  });
}

test('configuration fails closed for a partial AI provider setup', () => {
  const result = loadConfig({ NODE_ENV: 'development', AI_BASE_URL: 'https://api.example.com/v1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /configured together/);
});

test('production rejects insecure AI transport', () => {
  const result = loadConfig({
    NODE_ENV: 'production', SESSION_SECRET: 'a'.repeat(48),
    DATA_ENCRYPTION_KEY: 'ab'.repeat(32), AI_BASE_URL: 'http://api.example.com/v1', AI_API_KEY: 'secret-api-key',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not contain credentials and must use HTTPS/);
});
