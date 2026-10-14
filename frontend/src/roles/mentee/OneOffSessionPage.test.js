import test from 'node:test';
import assert from 'node:assert/strict';
import { oneOffSessionDetail, oneOffSessionList } from './OneOffSessionPage.js';

const mentor = { id: 'mentor-one', name: 'Mentor One', role: 'Engineer', company: 'HP', description: 'Helpful mentor.', rating: 5, reviewCount: 2, initials: 'MO' };
const offering = { id: 7, name: 'Code review', serviceType: 'ONE_OFF', description: 'Review a pull request together.', price: 500000, currency: 'VND', sessionDurationMinutes: 45, status: 'ACTIVE' };

test('one-off list renders only provided real offerings and links to their details', () => {
  const html = oneOffSessionList(mentor, [offering]);
  assert.match(html, /Code review/);
  assert.match(html, /offeringId=7/);
  assert.doesNotMatch(html, /discount|participant|spots left/i);
});

test('detail is honest when mentor availability is not implemented', () => {
  const html = oneOffSessionDetail(mentor, offering);
  assert.match(html, /No available times published yet/);
  assert.match(html, /Discussion agenda/);
  assert.match(html, /disabled/);
});
