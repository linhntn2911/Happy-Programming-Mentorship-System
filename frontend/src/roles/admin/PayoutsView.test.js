import test from 'node:test';
import assert from 'node:assert/strict';
import { PayoutsView } from './AdminViews.js';

test('payout admin view escapes mentor and bank fields and offers explicit transfer decisions', () => {
  const html = PayoutsView([{
    id: 12, mentorId: 8, mentorName: '<img src=x onerror=alert(1)>', mentorEmail: 'mentor@example.test',
    amount: 300000, bankName: '<script>bad()</script>', accountName: 'Mentor Name',
    accountNumber: '1234567890', status: 'REQUESTED', requestedAt: '2026-10-11T00:00:00Z',
  }]);
  assert.match(html, /data-payout-paid="12"/);
  assert.match(html, /data-payout-reject="12"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>bad/);
});
