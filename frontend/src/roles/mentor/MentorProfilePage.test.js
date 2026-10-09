import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorProfilePage } from './MentorProfilePage.js';

test('profile page loads real backend data without a development preview notice', () => {
  const markup = MentorProfilePage();
  assert.doesNotMatch(markup, /profile-demo-notice/);
  assert.match(markup, /profile-loading/);
  assert.match(markup, /mentor-profile-form/);
});
