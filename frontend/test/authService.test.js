import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/authService.js';

test('logout retains local identity on server failure and clears it only on success', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  let fail = true;
  globalThis.fetch = async url => url.endsWith('/csrf')
    ? { ok: true, json: async () => ({ data: { token: 'test-token', headerName: 'X-CSRF-TOKEN' } }) }
    : { ok: !fail, status: 503, json: async () => fail ? { message: 'Unavailable' } : { data: null } };
  try {
    authService.setCurrentUser({ id: 1, role: 'ADMIN' });
    await assert.rejects(authService.logout(), /Unavailable/);
    assert.equal(authService.getCurrentUser().role, 'ADMIN');
    fail = false;
    await authService.logout();
    assert.equal(authService.getCurrentUser(), null);
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; }
});
