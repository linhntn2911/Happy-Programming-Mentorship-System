import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorRequestsPage } from './MentorRequestsPage.js';

test('requests page lists pending requests behind a details action and modal', () => {
  const markup = MentorRequestsPage();

  assert.match(markup, /Incoming mentorship requests/);
  assert.match(markup, /id="requests-rows"/);
  assert.match(markup, /id="request-dialog-overlay" class="fixed inset-0 z-50 hidden items-center justify-center bg-black\/40 backdrop-blur-sm p-4 overflow-y-auto"/);
  assert.match(markup, /id="request-dialog" class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-auto mx-auto"/);
  assert.match(markup, /id="requests-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"/);
  assert.match(markup, /data-dialog-action="ACCEPTED"/);
  assert.match(markup, /data-dialog-action="REJECTED"/);
  assert.doesNotMatch(markup, /absolute top-0 left-0/);
  // Rows are populated at runtime; the static shell must not bake in inline Accept/Reject buttons.
  assert.doesNotMatch(markup, /data-details-id/);
});
