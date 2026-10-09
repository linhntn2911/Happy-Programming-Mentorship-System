import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorDashboardService } from './mentorDashboardService.js';

test('getMyDashboard reads the current mentor dashboard endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async url => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({ success: true, data: { summary: { pendingInvitations: 3 } } }),
    };
  };

  try {
    const result = await mentorDashboardService.getMyDashboard();
    assert.equal(requestedUrl, '/api/mentors/me/dashboard');
    assert.equal(result.summary.pendingInvitations, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('decideOnRequest sends the decision with a CSRF header', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return {
        ok: true,
        json: async () => ({ success: true, data: { headerName: 'X-CSRF-TOKEN', token: 'tok-123' } }),
      };
    }
    return {
      ok: true,
      json: async () => ({ success: true, data: { requestId: 9, status: 'REJECTED' } }),
    };
  };

  try {
    const result = await mentorDashboardService.decideOnRequest(9, 'REJECTED');
    const decision = calls.find(call => call.url === '/api/mentors/me/requests/9/decision');
    assert.ok(decision, 'decision request was not issued');
    assert.equal(decision.options.method, 'PUT');
    assert.deepEqual(JSON.parse(decision.options.body), { decision: 'REJECTED' });
    assert.equal(decision.options.headers['X-CSRF-TOKEN'], 'tok-123');
    assert.equal(result.status, 'REJECTED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('decision service rejects invalid decisions before issuing a request', async () => {
  const originalFetch = globalThis.fetch;
  let wasCalled = false;
  globalThis.fetch = async () => {
    wasCalled = true;
    throw new Error('Fetch should not run.');
  };

  try {
    await assert.rejects(
      mentorDashboardService.decideOnRequest(9, 'PENDING'),
      /Decision must be ACCEPTED or REJECTED/
    );
    assert.equal(wasCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
