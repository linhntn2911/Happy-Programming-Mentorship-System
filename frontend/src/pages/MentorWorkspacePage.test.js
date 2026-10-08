import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWorkspacePage } from './MentorWorkspacePage.js';

test('availability and package modules are separate mentor workspace routes with honest not-ready states', () => {
  const availability = MentorWorkspacePage('availability');
  const packages = MentorWorkspacePage('packages');

  assert.match(availability, /Availability schedule/);
  assert.match(availability, /Availability scheduling is not available yet/);
  assert.match(availability, /aria-current="page"/);
  assert.match(packages, /Mentorship packages/);
  assert.match(packages, /Package management is not available yet/);
  assert.match(packages, /No package has been created or changed/);
});
