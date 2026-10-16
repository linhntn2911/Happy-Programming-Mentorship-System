import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutFacts, countdownRemainingSeconds } from './CheckoutPage.js';

test('one-off checkout facts never render monthly billing fields', () => {
  const markup = checkoutFacts({
    requestId: 18,
    sessionStartAt: '2026-10-20T10:00:00Z',
    sessionEndAt: '2026-10-20T10:30:00Z',
    sessionDurationMinutes: 30,
    numberOfSessions: 2,
    numberOfParticipants: 3,
  }, true);

  assert.match(markup, /Session schedule/);
  assert.match(markup, /Sessions booked/);
  assert.match(markup, /Participants/);
  assert.doesNotMatch(markup, /calls \/ month|Billing period|Monthly/);
});

test('QR countdown uses the database clock instead of the browser clock', () => {
  assert.equal(
    countdownRemainingSeconds('2026-10-15T10:15:00Z', '2026-10-15T10:00:00Z'),
    900,
  );
  assert.equal(
    countdownRemainingSeconds('2026-10-15T10:15:00Z', '2026-10-15T10:00:00Z', 61_000),
    839,
  );
  assert.equal(
    countdownRemainingSeconds('2026-10-15T03:15:00Z', null, 61_000, 900),
    839,
  );
});
