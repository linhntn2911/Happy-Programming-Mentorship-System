import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationRelatedHref, safeNotificationHref } from './notificationLink.js';

test('notification links stay within app routes', () => {
  assert.equal(safeNotificationHref('#/account'), '#/account');
  assert.equal(safeNotificationHref('#/mentors/mentor-a'), '#/mentors/mentor-a');
  assert.equal(safeNotificationHref('#/checkout?requestId=42'), '#/checkout?requestId=42');
  assert.equal(safeNotificationHref('javascript:alert(1)'), '');
  assert.equal(safeNotificationHref('https://example.com'), '');
});

test('mentorship request notifications open the mentee application list, including older records', () => {
  assert.equal(notificationRelatedHref({ type: 'MENTORSHIP_REQUEST_ACCEPTED', actionUrl: '#/account' }), '#/applications');
  assert.equal(notificationRelatedHref({ type: 'MENTORSHIP_REQUEST_REJECTED', actionUrl: '#/checkout?requestId=9' }), '#/applications');
  assert.equal(notificationRelatedHref({ type: 'MENTORSHIP_REQUEST_RECEIVED', actionUrl: '#/mentor/dashboard' }), '#/mentor/dashboard');
});
