import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNotificationHref } from './notificationLink.js';

test('notification links stay within app routes', () => {
  assert.equal(safeNotificationHref('#/account'), '#/account');
  assert.equal(safeNotificationHref('#/mentors/mentor-a'), '#/mentors/mentor-a');
  assert.equal(safeNotificationHref('javascript:alert(1)'), '');
  assert.equal(safeNotificationHref('https://example.com'), '');
});
