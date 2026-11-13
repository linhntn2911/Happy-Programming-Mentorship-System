import test from 'node:test';
import assert from 'node:assert/strict';
import { menteeBookingWorkspaceUrl } from './MenteeApplicationsPage.js';

test('mentee booking workspace links identify both the booking and mentor conversation', () => {
  assert.equal(
    menteeBookingWorkspaceUrl({ requestId: 16, mentorId: 22 }),
    '#/workspace?requestId=16&partnerId=22',
  );
});
