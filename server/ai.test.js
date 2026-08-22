import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBlueprint, operatorReply } from './ai.js';

const brief = {
  idea: 'AI bookkeeping for independent designers',
  budget: 'Under $1,000',
  time: 'Under 5 hours',
  goal: '$5k MRR',
  autonomy: 'Approval required',
};
const provider = { baseUrl: 'https://ai.example.test/v1', apiKey: 'test-key-1234567890', model: 'gpt-4o-mini' };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
function contentResponse(text) {
  return jsonResponse({ choices: [{ message: { content: text } }] });
}
function streamResponse(bytes) {
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(bytes)); controller.close(); },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'application/json' } });
}

test('blueprint uses provider output with authorization and clamps out-of-range values', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://ai.example.test/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer test-key-1234567890');
    assert.equal(JSON.parse(options.body).model, 'gpt-4o-mini');
    return contentResponse('{"thesis":"A disciplined niche service.","score":120,"launchDays":1}');
  };
  try {
    const result = await buildBlueprint(brief, provider);
    assert.equal(result.source, 'ai-provider');
    assert.equal(result.thesis, 'A disciplined niche service.');
    assert.equal(result.score, 96, 'score clamped to 96 max');
    assert.equal(result.launchDays, 7, 'launchDays clamped to 7 min');
  } finally { globalThis.fetch = originalFetch; }
});

test('blueprint falls back to the venture engine when the provider errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: 'boom' }, 500);
  try {
    const result = await buildBlueprint(brief, provider);
    assert.equal(result.source, 'venture-engine');
    assert.ok(result.thesis.includes(brief.idea));
  } finally { globalThis.fetch = originalFetch; }
});

test('blueprint falls back when the provider response exceeds the 1 MB cap', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => streamResponse(2_000_000);
  try {
    const result = await buildBlueprint(brief, provider);
    assert.equal(result.source, 'venture-engine');
  } finally { globalThis.fetch = originalFetch; }
});

test('blueprint falls back when the provider returns malformed JSON', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => contentResponse('not-json-at-all');
  try {
    const result = await buildBlueprint(brief, provider);
    assert.equal(result.source, 'venture-engine');
  } finally { globalThis.fetch = originalFetch; }
});

test('operator reply uses the provider and is bounded to 1800 characters', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => contentResponse('x'.repeat(9000));
  try {
    const reply = await operatorReply('Plan my launch', [{ name: 'Venture', stage: 'Blueprint ready' }], provider);
    assert.equal(reply.source, 'ai-provider');
    assert.ok(reply.text.length <= 1800);
    assert.ok(reply.text.length > 100);
  } finally { globalThis.fetch = originalFetch; }
});

test('operator falls back to deterministic guidance without a provider', async () => {
  const reply = await operatorReply('Pressure-test a niche analytics service', [], null);
  assert.equal(reply.source, 'venture-engine');
  assert.ok(reply.text.length > 30 && reply.text.length <= 1800);
});
