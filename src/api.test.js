import test from 'node:test';
import assert from 'node:assert/strict';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('API client coalesces session setup and retries one expired CSRF token', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let sessionCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/v1/session') {
      sessionCount += 1;
      return jsonResponse({ csrfToken: sessionCount === 1 ? 'csrf-old' : 'csrf-new', user: null });
    }
    if (url === '/api/v1/blueprints' && calls.filter(c => c.url === url).length === 1) {
      assert.equal(options.headers['x-csrf-token'], 'csrf-old');
      return jsonResponse({ error: { code: 'CSRF_INVALID', message: 'expired' } }, 403);
    }
    assert.equal(options.headers['x-csrf-token'], 'csrf-new');
    return jsonResponse({ blueprint: { score: 90 } });
  };

  try {
    const { api, initializeSession } = await import(`./api.js?test=${Date.now()}`);
    const [a, b] = await Promise.all([initializeSession(), initializeSession()]);
    assert.equal(a.csrfToken, 'csrf-old');
    assert.equal(b.csrfToken, 'csrf-old');
    assert.equal(sessionCount, 1, 'parallel initialization should make one request');
    const result = await api.createBlueprint({ idea: 'test' });
    assert.equal(result.blueprint.score, 90);
    assert.equal(sessionCount, 2, 'CSRF failure should refresh exactly once');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
