import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceListMarkup, workspaceMessages } from './MentorshipWorkspacePage.js';

test('workspace message renderer escapes text and renders code as code', () => {
  const markup = workspaceMessages([
    { senderName: '<Mentor>', messageType: 'TEXT', body: '<img src=x onerror=alert(1)>', sentAt: null, mine: false },
    { senderName: 'Mentee', messageType: 'CODE', body: 'if (a < b) return;', codeLanguage: 'Java', sentAt: null, mine: true },
  ]);
  assert.doesNotMatch(markup, /<img src=x/);
  assert.match(markup, /&lt;img src=x/);
  assert.match(markup, /<pre/);
  assert.match(markup, /if \(a &lt; b\) return;/);
});

test('workspace file messages render an authorized download link', () => {
  const markup = workspaceMessages([
    { id: 9, senderName: 'Mentor', messageType: 'FILE', fileName: 'lesson.pdf', fileSizeBytes: 2048, mine: false },
  ], 30);
  assert.match(markup, /lesson\.pdf/);
  assert.match(markup, /\/api\/mentorship-workspaces\/30\/messages\/9\/file/);
  assert.match(markup, /2\.0 KB/);
});

test('mentor workspace opens with a mentee list before conversation detail', () => {
  const markup = workspaceListMarkup([
    { subscriptionId: 30, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', unreadCount: 2 },
    { subscriptionId: 31, partnerName: 'Binh Mentee', packageName: 'Pro', subscriptionStatus: 'TRIALING' },
  ], true);
  assert.match(markup, /Your mentees/);
  assert.match(markup, /data-workspace-id="30"/);
  assert.match(markup, /data-workspace-id="31"/);
  assert.match(markup, /2 new/);
  assert.doesNotMatch(markup, /Conversation with/);
});
