import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWorkspaceList, workspaceConversationMarkup, workspaceListMarkup, workspaceMessages } from './MentorshipWorkspacePage.js';

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

test('workspace messages filter loaded history and mark the unread boundary', () => {
  const messages = [
    { id: 1, senderName: 'Mentee', messageType: 'TEXT', body: 'Old Java question', mine: false },
    { id: 2, senderName: 'Mentor', messageType: 'TEXT', body: 'Review the repository layer', mine: true },
    { id: 3, senderName: 'Mentee', messageType: 'TEXT', body: 'New Spring question', mine: false },
  ];
  const unreadMarkup = workspaceMessages(messages, 30, { unreadCount: 1 });
  assert.equal((unreadMarkup.match(/data-unread-divider/g) || []).length, 1);
  assert.equal((unreadMarkup.match(/data-unread-message="true"/g) || []).length, 1);
  assert.match(unreadMarkup, /New Spring question/);

  const searchMarkup = workspaceMessages(messages, 30, { query: 'spring', unreadCount: 1 });
  assert.match(searchMarkup, /New Spring question/);
  assert.doesNotMatch(searchMarkup, /Old Java question/);
  assert.doesNotMatch(searchMarkup, /Review the repository layer/);
});

test('mentor workspace opens with a messenger-style mentee list before conversation detail', () => {
  const markup = workspaceListMarkup([
    { subscriptionId: 30, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', unreadCount: 2 },
    { subscriptionId: 31, partnerName: 'Binh Mentee', packageName: 'Pro', subscriptionStatus: 'TRIALING' },
  ], true);
  assert.match(markup, /Your mentees/);
  assert.match(markup, /data-workspace-messenger/);
  assert.match(markup, /id="workspace-list-filter"/);
  assert.match(markup, />All<\/option>/);
  assert.match(markup, /data-toggle-workspace-search/);
  assert.match(markup, /id="workspace-list-search"/);
  assert.match(markup, /Select a conversation/);
  assert.match(markup, /data-workspace-id="30"/);
  assert.match(markup, /data-workspace-id="31"/);
  assert.match(markup, /data-workspace-unread/);
  assert.doesNotMatch(markup, /id="workspace-message-form"/);
});

test('workspace list filter searches partner and package while preserving status options', () => {
  const workspaces = [
    { subscriptionId: 30, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE' },
    { subscriptionId: 31, partnerName: 'Binh Mentee', packageName: 'Pro', subscriptionStatus: 'TRIALING' },
  ];
  assert.deepEqual(filterWorkspaceList(workspaces, 'ACTIVE').map(item => item.subscriptionId), [30]);
  assert.deepEqual(filterWorkspaceList(workspaces, 'ALL', 'pro').map(item => item.subscriptionId), [31]);
  assert.deepEqual(filterWorkspaceList(workspaces, 'TRIALING', 'an').map(item => item.subscriptionId), []);
});

test('selected mentorship keeps the conversation list beside messages and context', () => {
  const workspaces = [
    { subscriptionId: 30, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', unreadCount: 2, currentPeriodEnd: '2026-11-12T00:00:00Z' },
    { subscriptionId: 31, partnerName: 'Binh Mentee', packageName: 'Pro', subscriptionStatus: 'TRIALING' },
  ];
  const markup = workspaceConversationMarkup({
    ...workspaces[0],
    currentPeriodStart: '2026-10-12T00:00:00Z',
    callsPerPeriod: 2,
    sessionDurationMinutes: 45,
    learningGoals: 'Improve backend design.',
    messages: [],
  }, workspaces, true);
  assert.match(markup, /aria-current="true"/);
  assert.match(markup, /id="workspace-messages"/);
  assert.match(markup, /id="workspace-message-form"/);
  assert.match(markup, /id="workspace-conversation-actions"/);
  assert.match(markup, /aria-haspopup="menu"/);
  assert.match(markup, /id="workspace-conversation-menu"[^>]*role="menu"[^>]*hidden/);
  assert.match(markup, /data-open-message-search/);
  assert.match(markup, /id="workspace-list-filter"/);
  assert.match(markup, /data-toggle-workspace-search/);
  assert.match(markup, /id="workspace-search-panel"[^>]*hidden/);
  assert.match(markup, /id="workspace-message-search"/);
  assert.match(markup, /id="workspace-search-status"/);
  assert.match(markup, /aria-label="Send message"/);
  assert.match(markup, /rows="1"/);
  assert.match(markup, /Enter to send · Shift \+ Enter for a new line/);
  assert.match(markup, /Mentorship details/i);
  assert.match(markup, /Improve backend design\./);
});
