import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorWalletService } from './mentorWalletService.js';

test('payout request fetches a CSRF token before posting bank details', async t => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const data = url === '/api/auth/csrf'
      ? { success: true, data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-value' } }
      : { success: true, data: { id: 7, status: 'REQUESTED' } };
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const payload = { amount: 500000, bankName: 'Test Bank', accountName: 'Mentor', accountNumber: '1234567890' };
  const result = await mentorWalletService.requestPayout(payload);

  assert.equal(result.id, 7);
  assert.equal(calls[0].url, '/api/auth/csrf');
  assert.equal(calls[1].url, '/api/mentors/me/payout-requests');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-value');
  assert.deepEqual(JSON.parse(calls[1].options.body), payload);
});
