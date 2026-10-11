import test from 'node:test';
import assert from 'node:assert/strict';
import { menteeApplicationsService } from './menteeApplicationsService.js';

test('cancel fetches a CSRF token and sends it with the cancellation request', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return { ok: true, json: async () => ({ success: true, data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-123' } }) };
    }
    return { ok: true, json: async () => ({ success: true, data: null }) };
  };

  try {
    await menteeApplicationsService.cancel('1');
    assert.equal(calls[0].url, '/api/auth/csrf');
    assert.equal(calls[1].url, '/api/mentorship-requests/1/cancel');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cancel does not issue a mutation when the CSRF token cannot be loaded', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    return { ok: true, json: async () => ({ success: true, data: {} }) };
  };

  try {
    await assert.rejects(menteeApplicationsService.cancel('1'), /session could not be verified/i);
    assert.deepEqual(calls, ['/api/auth/csrf']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
