import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorRequestsPage } from './MentorRequestsPage.js';

test('requests page exposes persisted request history, status filtering, and the shared details modal', () => {
  const markup = MentorRequestsPage();

  assert.match(markup, /Mentorship requests/);
  assert.match(markup, /id="request-status-filter"/);
  assert.match(markup, /value="ACCEPTED">Accepted/);
  assert.match(markup, /id="requests-rows"/);
  assert.match(markup, /id="request-dialog-overlay" class="fixed inset-0 z-50 hidden items-center justify-center bg-black\/40 backdrop-blur-sm p-4 overflow-y-auto"/);
  assert.match(markup, /id="request-dialog" class="relative mx-auto my-auto w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl"/);
  assert.match(markup, /id="request-dialog-status"/);
  assert.match(markup, /id="requests-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"/);
  assert.match(markup, /data-dialog-action="ACCEPTED"/);
  assert.match(markup, /data-dialog-action="REJECTED"/);
  assert.doesNotMatch(markup, /absolute top-0 left-0/);
  // Rows are populated at runtime; the static shell must not bake in inline Accept/Reject buttons.
  assert.doesNotMatch(markup, /data-details-id/);
});
