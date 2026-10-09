import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWithDevelopmentFallback } from './mentorDemoData.js';

test('development mode uses a clearly marked fallback for an unavailable API', async () => {
  const result = await loadWithDevelopmentFallback(
    async () => { throw new TypeError('Failed to fetch'); },
    { profile: { userId: 42 } },
    { development: true }
  );

  assert.equal(result.isMock, true);
  assert.deepEqual(result.data, { profile: { userId: 42 } });
});

test('development fallback is disabled outside development builds', async () => {
  const apiError = new Error('Database unavailable');
  await assert.rejects(
    loadWithDevelopmentFallback(
      async () => { throw apiError; },
      { profile: { userId: 42 } },
      { development: false }
    ),
    error => error === apiError
  );
});

test('development fallback does not hide client request errors', async () => {
  const apiError = Object.assign(new Error('Not found'), { status: 404 });
  await assert.rejects(
    loadWithDevelopmentFallback(
      async () => { throw apiError; },
      { profile: { userId: 42 } },
      { development: true }
    ),
    error => error === apiError
  );
});
