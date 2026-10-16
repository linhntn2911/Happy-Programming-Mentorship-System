import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOneOffTotal,
  oneOffSessionDetail,
  oneOffSessionList,
} from './OneOffSessionPage.js';

const mentor = { id: 'mentor-one', name: 'Mentor One', role: 'Engineer', company: 'HP', description: 'Helpful mentor.', rating: 5, reviewCount: 2, initials: 'MO' };
const offering = { id: 7, name: 'Code review', serviceType: 'ONE_OFF', description: 'Review a pull request together.', price: 500000, currency: 'VND', sessionDurationMinutes: 45, status: 'ACTIVE' };

test('one-off list renders only provided real offerings and links to their details', () => {
  const html = oneOffSessionList(mentor, [offering]);
  assert.match(html, /Code review/);
  assert.match(html, /offeringId=7/);
  assert.doesNotMatch(html, /discount|participant|spots left/i);
});

test('detail offers direct checkout without mentor approval copy', () => {
  const html = oneOffSessionDetail(mentor, offering);
  assert.match(html, /id="session-request-form"/);
  assert.match(html, /Discussion agenda/);
  assert.match(html, /id="session-experience"/);
  assert.match(html, /id="session-terms"/);
  assert.match(html, /Continue to payment/);
  assert.doesNotMatch(html, /mentor must accept|48 hours|Waiting for/i);
  assert.doesNotMatch(html, /No available times published yet/);
  assert.doesNotMatch(html, /Choose a time/);
});

test('detail groups real availability into selectable dates and a compact scrolling time list', () => {
  const html = oneOffSessionDetail(mentor, offering, [
    { id: 1, startAt: '2026-10-16T10:00:00Z', endAt: '2026-10-16T10:45:00Z', available: true },
    { id: 1, startAt: '2026-10-16T10:10:00Z', endAt: '2026-10-16T10:55:00Z', available: true },
  ]);
  assert.match(html, /data-slot-date=/);
  assert.match(html, /data-session-slot/);
  assert.match(html, /data-start-at="2026-10-16T10:00:00Z"/);
  assert.match(html, /max-h-56 overflow-y-auto/);
  assert.doesNotMatch(html, /�/);
});

test('detail includes checkout quantities and an in-page all sessions dialog', () => {
  const secondOffering = { ...offering, id: 8, name: 'Mock interview', price: 750000, sessionDurationMinutes: 60 };
  const html = oneOffSessionDetail(mentor, offering, [], [offering, secondOffering]);
  assert.match(html, /Number of sessions/);
  assert.match(html, /Number of participants/);
  assert.match(html, /data-session-total/);
  assert.match(html, /data-all-sessions-open/);
  assert.match(html, /data-all-sessions-modal/);
  assert.match(html, /Mock interview/);
  assert.doesNotMatch(html, /href="#\/mentors\/mentor-one\/sessions">View all sessions/);
});

test('checkout total multiplies price by sessions and participants', () => {
  assert.equal(calculateOneOffTotal(99000, 2, 2), 396000);
  assert.equal(calculateOneOffTotal(99000, 1, 3), 297000);
});
