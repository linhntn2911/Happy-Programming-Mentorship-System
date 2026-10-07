import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorProfilePage } from './MentorProfilePage.js';

test('profile page provides an explicit development preview notice and loading state', () => {
  const markup = MentorProfilePage();
  assert.match(markup, /profile-demo-notice/);
  assert.match(markup, /sample profile data is read-only/);
  assert.match(markup, /profile-loading/);
});
