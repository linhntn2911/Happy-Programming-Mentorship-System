import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorRequestsPage } from './MentorRequestsPage.js';

test('requests page lists pending requests behind a details action and modal', () => {
  const markup = MentorRequestsPage();

  assert.match(markup, /Incoming mentorship requests/);
  assert.match(markup, /id="requests-rows"/);
  assert.match(markup, /id="request-dialog"/);
  assert.match(markup, /data-dialog-action="ACCEPTED"/);
  assert.match(markup, /data-dialog-action="REJECTED"/);
  // Rows are populated at runtime; the static shell must not bake in inline Accept/Reject buttons.
  assert.doesNotMatch(markup, /data-details-id/);
});
