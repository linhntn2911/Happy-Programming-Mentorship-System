import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorshipWorkspaceService } from './mentorshipWorkspaceService.js';

test('send obtains CSRF and posts an idempotent workspace message', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return { ok: true, json: async () => ({ data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-1' } }) };
    }
    return { ok: true, json: async () => ({ data: { id: 7, body: 'Hello' } }) };
  };
  try {
    const result = await mentorshipWorkspaceService.send(30, {
      clientMessageKey: 'client-1', messageType: 'TEXT', body: 'Hello', codeLanguage: null,
    });
    assert.equal(result.id, 7);
    assert.equal(calls[1].url, '/api/mentorship-workspaces/30/messages');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-1');
    assert.match(calls[1].options.body, /client-1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('upload posts multipart data with csrf and preserves the selected file', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return { ok: true, json: async () => ({ data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-2' } }) };
    }
    return { ok: true, json: async () => ({ data: { id: 8, messageType: 'FILE' } }) };
  };
  try {
    const file = new Blob(['lesson'], { type: 'text/plain' });
    const result = await mentorshipWorkspaceService.upload(30, file, 'file-1');
    assert.equal(result.messageType, 'FILE');
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-2');
    assert.equal(calls[1].options.headers['Content-Type'], undefined);
    assert.ok(calls[1].options.body instanceof FormData);
    assert.equal(calls[1].options.body.get('clientMessageKey'), 'file-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('markRead uses a csrf-protected workspace mutation', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/auth/csrf') {
      return { ok: true, json: async () => ({ data: { headerName: 'X-CSRF-TOKEN', token: 'csrf-read' } }) };
    }
    return { ok: true, json: async () => ({ data: null }) };
  };
  try {
    await mentorshipWorkspaceService.markRead(30);
    assert.equal(calls[1].url, '/api/mentorship-workspaces/30/read');
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-read');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
