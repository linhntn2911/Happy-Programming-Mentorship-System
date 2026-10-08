import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWorkspacePage } from './MentorWorkspacePage.js';
import { MentorDashboardPage } from './MentorDashboardPage.js';
import { MentorProfilePage } from './MentorProfilePage.js';

test('all mentor workspace routes share the operational shell and select their own navigation item', () => {
  const routes = [
    [MentorDashboardPage(), '#/mentor/dashboard'],
    [MentorProfilePage(), '#/mentor/profile'],
    [MentorWorkspacePage('availability'), '#/mentor/availability'],
    [MentorWorkspacePage('packages'), '#/mentor/packages'],
  ];

  for (const [markup, activeRoute] of routes) {
    assert.match(markup, /class="admin-shell"/);
    assert.match(markup, /MENTOR WORKSPACE/);
    assert.match(markup, /class="admin-topbar"/);
    assert.match(markup, /id="mentor-logout-btn"/);
    assert.ok(markup.includes(`href="${activeRoute}" aria-current="page"`));
    assert.doesNotMatch(markup, /class="directory-header"/);
  }
});

test('availability module keeps an honest not-ready state', () => {
  const availability = MentorWorkspacePage('availability');

  assert.match(availability, /Availability schedule/);
  assert.match(availability, /Availability scheduling is not available yet/);
  assert.match(availability, /aria-current="page"/);
  assert.doesNotMatch(availability, /mentor-packages-form/);
});

test('packages module renders the mentorship package management form', () => {
  const packages = MentorWorkspacePage('packages');

  assert.match(packages, /Mentorship packages/);
  assert.match(packages, /aria-current="page"/);
  assert.match(packages, /id="mentor-packages-form"/);
  assert.match(packages, /id="package-price"/);
  assert.match(packages, /id="package-calls"/);
  assert.match(packages, /id="package-minutes"/);
  assert.doesNotMatch(packages, /Package management is not available yet/);
});
