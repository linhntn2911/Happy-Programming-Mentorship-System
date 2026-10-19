import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentorshipRequestService } from '../src/roles/mentee/mentorshipRequestService.js';

test('mentorshipRequestService fetches checkout info and posts checkout with csrf', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/api/auth/csrf')) {
      return {
        ok: true,
        json: async () => ({
          headerName: 'X-CSRF-TOKEN',
          token: 'csrf-123',
        }),
      };
    }
    if (url.includes('/checkout-info')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            requestId: 42,
            mentorName: 'Test Mentor',
            status: 'ACCEPTED',
            amount: 2500000,
          },
        }),
      };
    }
    if (url.includes('/checkout')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            subscriptionId: 101,
            requestId: 42,
            status: 'TRIALING',
          },
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const info = await mentorshipRequestService.getCheckoutInfo(42);
    assert.equal(info.requestId, 42);
    assert.equal(info.mentorName, 'Test Mentor');
    const infoCall = calls.find(c => c.url.endsWith('/api/mentorship-requests/42/checkout-info'));
    assert.equal(infoCall.options.cache, 'no-store');

    const result = await mentorshipRequestService.processCheckout(42, { paymentMethod: 'SEPAY' });
    assert.equal(result.subscriptionId, 101);
    assert.equal(result.status, 'TRIALING');

    const checkoutCall = calls.find(c => c.url.endsWith('/api/mentorship-requests/42/checkout'));
    assert.ok(checkoutCall);
    assert.equal(checkoutCall.options.headers['X-CSRF-TOKEN'], 'csrf-123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
