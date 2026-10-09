import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, ApiClientError } from './apiClient.js';

test('apiClient preserves default JSON headers while adding an authorization header', async () => {
  const originalFetch = globalThis.fetch;
  let requestOptions;
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return {
      ok: true,
      json: async () => ({ success: true, data: { id: 42 } }),
    };
  };

  try {
    const result = await apiClient('/api/mentors/me/profile', {
      headers: { Authorization: 'Bearer dev-session-token' },
    });
    assert.deepEqual(result, { id: 42 });
    assert.equal(requestOptions.credentials, 'same-origin');
    assert.equal(requestOptions.headers['Content-Type'], 'application/json');
    assert.equal(requestOptions.headers.Authorization, 'Bearer dev-session-token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient rejects timed out requests instead of leaving callers pending', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  });

  try {
    await assert.rejects(
      apiClient('/api/mentors/me/dashboard', { timeoutMs: 5 }),
      /request timed out/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient retains HTTP status for explicit API failures', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ message: 'Mentor data is temporarily unavailable.' }),
  });

  try {
    await assert.rejects(
      apiClient('/api/mentors/me/profile'),
      error => error instanceof ApiClientError
        && error.status === 503
        && error.message === 'Mentor data is temporarily unavailable.'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
