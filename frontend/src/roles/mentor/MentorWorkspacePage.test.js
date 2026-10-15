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

test('availability module renders the open-slot manager', () => {
  const availability = MentorWorkspacePage('availability');

  assert.match(availability, /Availability schedule/);
  assert.match(availability, /id="availability-form"/);
  assert.match(availability, /id="availability-date"/);
  assert.match(availability, /id="availability-start"/);
  assert.match(availability, /id="availability-end"/);
  assert.match(availability, /id="availability-reason"/);
  assert.match(availability, /id="availability-list"/);
  assert.match(availability, /id="availability-loading"/);
  assert.match(availability, /id="availability-empty"/);
  assert.match(availability, /id="availability-error"/);
  assert.match(availability, /id="availability-toast"/);
  assert.match(availability, /aria-current="page"/);
  assert.doesNotMatch(availability, /mentor-packages-form/);
  assert.doesNotMatch(availability, /not available yet/);
});

test('packages module renders one card per tier with enable toggles', () => {
  const packages = MentorWorkspacePage('packages');

  assert.match(packages, /Mentorship packages/);
  assert.match(packages, /aria-current="page"/);
  assert.match(packages, /id="mentor-packages-form"/);
  assert.match(packages, /data-tier="LITE"/);
  assert.match(packages, /data-tier="STANDARD"/);
  assert.match(packages, /data-tier="PRO"/);
  assert.match(packages, /id="tier-lite-active"/);
  assert.match(packages, /id="tier-standard-price"/);
  assert.match(packages, /id="tier-pro-description"/);
  assert.doesNotMatch(packages, /Package management is not available yet/);
});
