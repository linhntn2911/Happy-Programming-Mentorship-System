import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorAvailabilityService } from './mentorAvailabilityService.js';

function mockFetch(t, responder) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const data = responder(url);
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  return calls;
}

test('getMyAvailability returns the slot list from the envelope', async t => {
  mockFetch(t, () => ({ success: true, data: [{ id: 4, startAt: '2026-10-20T10:00:00Z' }] }));

  const slots = await mentorAvailabilityService.getMyAvailability();

  assert.equal(slots.length, 1);
  assert.equal(slots[0].id, 4);
});

test('createSlot fetches a CSRF token before posting the slot', async t => {
  const calls = mockFetch(t, url => url === '/api/auth/csrf'
    ? { success: true, data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-value' } }
    : { success: true, data: { id: 9, status: 'ACTIVE' } });

  const created = await mentorAvailabilityService.createSlot({
    startAt: '2026-10-20T10:00:00Z', endAt: '2026-10-20T12:00:00Z', reason: 'Open',
  });

  assert.equal(created.id, 9);
  assert.equal(calls[0].url, '/api/auth/csrf');
  assert.equal(calls[1].url, '/api/mentors/me/availability');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-value');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    startAt: '2026-10-20T10:00:00Z', endAt: '2026-10-20T12:00:00Z', reason: 'Open',
  });
});

test('deleteSlot sends an authenticated CSRF delete request', async t => {
  const calls = mockFetch(t, url => url === '/api/auth/csrf'
    ? { success: true, data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-value' } }
    : { success: true, data: null });

  await mentorAvailabilityService.deleteSlot(9);

  assert.equal(calls[1].url, '/api/mentors/me/availability/9');
  assert.equal(calls[1].options.method, 'DELETE');
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-value');
});
