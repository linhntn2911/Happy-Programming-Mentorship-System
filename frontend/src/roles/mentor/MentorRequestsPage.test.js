import test from 'node:test';
import assert from 'node:assert/strict';
import { canOpenBookingWorkspace, filterMentorBookings, MentorRequestsPage } from './MentorRequestsPage.js';

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
  assert.match(markup, /id="request-dialog-workspace"/);
  assert.doesNotMatch(markup, /absolute top-0 left-0/);
  // Rows are populated at runtime; the static shell must not bake in inline Accept/Reject buttons.
  assert.doesNotMatch(markup, /data-details-id/);
});

test('paid or completed bookings can open their learning workspace', () => {
  assert.equal(canOpenBookingWorkspace({ lifecycleStatus: 'ACTIVE' }), true);
  assert.equal(canOpenBookingWorkspace({ lifecycleStatus: 'CONFIRMED' }), true);
  assert.equal(canOpenBookingWorkspace({ lifecycleStatus: 'COMPLETED' }), true);
  assert.equal(canOpenBookingWorkspace({ lifecycleStatus: 'AWAITING_PAYMENT' }), false);
  assert.equal(canOpenBookingWorkspace({ lifecycleStatus: 'REJECTED' }), false);
});

test('booking filters return loaded bookings without relying on an undefined request list', () => {
  const bookings = [
    {
      id: 11,
      menteeName: 'Nguyen Van An',
      packageName: 'Lite',
      serviceType: 'MONTHLY',
      status: 'PENDING',
    },
    {
      id: 12,
      menteeName: 'Tran Linh',
      packageName: 'Code Review',
      serviceType: 'ONE_OFF',
      lifecycleStatus: 'CONFIRMED',
    },
  ];

  assert.deepEqual(filterMentorBookings(bookings), bookings);
  assert.deepEqual(
    filterMentorBookings(bookings, { query: 'tran linh', status: 'CONFIRMED', type: 'ONE_OFF' }),
    [bookings[1]],
  );
  assert.deepEqual(filterMentorBookings(undefined), []);
});
