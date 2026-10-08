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
    assert.equal(result.data.summary.pendingInvitations, 3);
    assert.equal(result.isMock, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('decideOnRequest sends only the selected decision', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ success: true, data: { requestId: 9, status: 'REJECTED' } }),
    };
  };

  try {
    const result = await mentorDashboardService.decideOnRequest(9, 'REJECTED');
    assert.equal(request.url, '/api/mentors/me/requests/9/decision');
    assert.equal(request.options.method, 'PUT');
    assert.deepEqual(JSON.parse(request.options.body), { decision: 'REJECTED' });
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
