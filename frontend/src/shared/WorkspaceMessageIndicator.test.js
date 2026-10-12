import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspaceMessageIndicator } from './WorkspaceMessageIndicator.js';

test('message indicator links to mentorships and starts with a hidden unread badge', () => {
  const markup = renderWorkspaceMessageIndicator({ alwaysVisible: true });
  assert.match(markup, /href="#\/workspace"/);
  assert.match(markup, /data-workspace-message-badge/);
  assert.match(markup, /Mentorship messages/);
});

