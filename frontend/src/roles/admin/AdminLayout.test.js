import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminLayout } from './AdminLayout.js';

test('authenticated admin header places sign out next to the account profile', () => {
  const html = AdminLayout('overview', '<p>Content</p>', { name: 'System Administrator', authenticated: true });

  assert.match(html, /admin-profile[\s\S]*System Administrator[\s\S]*id="admin-logout"[\s\S]*Sign out/);
  assert.doesNotMatch(html, /Demo administrator|Explore demo workspace|Just exploring/);
});

test('unauthenticated admin shell does not render a sign out action', () => {
  const html = AdminLayout('overview', '<p>Loading</p>');
  assert.doesNotMatch(html, /id="admin-logout"/);
});
