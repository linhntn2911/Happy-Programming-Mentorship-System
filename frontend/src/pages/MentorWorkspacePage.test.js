import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWorkspacePage } from './MentorWorkspacePage.js';

test('availability module keeps an honest not-ready state', () => {
  const availability = MentorWorkspacePage('availability');

  assert.match(availability, /Availability schedule/);
  assert.match(availability, /Availability scheduling is not available yet/);
  assert.match(availability, /aria-current="page"/);
  assert.doesNotMatch(availability, /mentor-packages-form/);
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
