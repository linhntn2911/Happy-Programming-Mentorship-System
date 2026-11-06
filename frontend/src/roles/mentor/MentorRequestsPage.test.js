import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorRequestsPage } from './MentorRequestsPage.js';

test('bookings page combines monthly applications and one-off session controls', () => {
  const markup = MentorRequestsPage();

  assert.match(markup, /class="admin-shell"/);
  assert.match(markup, /Workspace<\/span><span class="mx-2 text-muted">\/<\/span>Bookings/);
  assert.match(markup, /href="#\/mentor\/bookings" aria-current="page"/);
  assert.doesNotMatch(markup, /aria-label="Mentor navigation"/);
  assert.match(markup, />Bookings<\/h1>/);
  assert.match(markup, /class="admin-page-heading"/);
  assert.match(markup, /id="requests-content" class="admin-panel"/);
  assert.match(markup, /class="data-table min-w-\[860px\]"/);
  assert.match(markup, /id="request-search-input"/);
  assert.match(markup, /id="request-status-filter"/);
  assert.match(markup, /value="AWAITING_PAYMENT">Awaiting payment/);
  assert.match(markup, /id="request-type-filter"/);
  assert.match(markup, /value="ONE_OFF">One-off session/);
  assert.match(markup, /id="requests-rows"/);
  assert.match(markup, /id="request-dialog-overlay" class="fixed inset-0 z-50 hidden items-center justify-center bg-black\/40 backdrop-blur-sm p-4 overflow-y-auto"/);
  assert.match(markup, /id="request-dialog" class="relative mx-auto my-auto w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl"/);
  assert.match(markup, /id="request-dialog-status"/);
  assert.match(markup, /id="request-dialog-type"/);
  assert.match(markup, /id="requests-error" class="admin-notice notice-error mb-5"/);
  assert.match(markup, /data-dialog-action="ACCEPTED"/);
  assert.match(markup, /data-dialog-action="REJECTED"/);
  assert.doesNotMatch(markup, /absolute top-0 left-0/);
  // Rows are populated at runtime; the static shell must not bake in inline Accept/Reject buttons.
  assert.doesNotMatch(markup, /data-details-id/);
});
