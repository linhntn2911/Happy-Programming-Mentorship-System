import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorDisputeService } from './mentorDisputeService.js';

test('list omits the status query for ALL and encodes a specific status', async t => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(url);
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const all = await mentorDisputeService.list('ALL');
  const submitted = await mentorDisputeService.list('SUBMITTED');

  assert.deepEqual(all, []);
  assert.deepEqual(submitted, []);
  assert.equal(urls[0], '/api/mentors/me/disputes');
  assert.equal(urls[1], '/api/mentors/me/disputes?status=SUBMITTED');
});

test('get requests a single dispute by id', async t => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(url);
    return new Response(JSON.stringify({ success: true, data: { id: 12, status: 'IN_MEDIATION' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const detail = await mentorDisputeService.get(12);

  assert.equal(urls[0], '/api/mentors/me/disputes/12');
  assert.equal(detail.status, 'IN_MEDIATION');
});

test('respond posts multipart form data with the CSRF header and attachments', async t => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'tok-1' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true, data: { id: 12, responded: true } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const file = new File(['proof'], 'proof.png', { type: 'image/png' });
  const result = await mentorDisputeService.respond(12, 'I offered a make-up session.', [file]);

  assert.equal(result.responded, true);
  const post = calls[1];
  assert.equal(post.url, '/api/mentors/me/disputes/12/responses');
  assert.equal(post.options.method, 'POST');
  assert.equal(post.options.credentials, 'same-origin');
  assert.equal(post.options.headers['X-CSRF-TOKEN'], 'tok-1');
  assert.equal(post.options.body.get('message'), 'I offered a make-up session.');
  assert.equal(post.options.body.getAll('files').length, 1);
});

test('respond surfaces the backend message when the dispute is closed', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'tok-2' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: false, message: 'This dispute is closed and no longer accepts responses.' }), {
      status: 409, headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => mentorDisputeService.respond(9, 'Too late to explain.'),
    /This dispute is closed and no longer accepts responses\./,
  );
});

test('respond fails when the CSRF token cannot be read', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => mentorDisputeService.respond(9, 'Any explanation here.'),
    /Your session could not be verified/,
  );
});

test('evidenceUrl builds the authenticated download path', () => {
  assert.equal(
    mentorDisputeService.evidenceUrl(12, 31),
    '/api/mentors/me/disputes/12/evidence/31/file',
  );
});
