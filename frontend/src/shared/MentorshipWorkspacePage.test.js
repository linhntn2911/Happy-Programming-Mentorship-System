import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWorkspaceList, workspaceConversationMarkup, workspaceEngagementsMarkup, workspaceListMarkup, workspaceMessages } from './MentorshipWorkspacePage.js';

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

test('workspace renders shared images inline and offers a code composer', () => {
  const imageMarkup = workspaceMessages([
    { id: 10, senderName: 'Mentor', messageType: 'FILE', fileName: 'diagram.png', fileMimeType: 'image/png', fileSizeBytes: 2048, mine: false },
  ], 30);
  assert.match(imageMarkup, /<img/);
  assert.match(imageMarkup, /diagram\.png/);

  const markup = workspaceConversationMarkup({
    workspaceId: 40, conversationId: 40, partnerName: 'A Mentor', partnerRole: 'MENTOR',
    packageName: 'Lite', subscriptionStatus: 'ACTIVE', hasMonthly: true, messages: [], oneOffSessions: [],
  }, [], false);
  assert.match(markup, /id="workspace-message-type"/);
  assert.match(markup, />Code snippet</);
  assert.match(markup, /id="workspace-code-language"/);
  assert.match(markup, /Attach image or file/);
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
    { workspaceId: 40, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', hasMonthly: true, unreadCount: 2 },
    { workspaceId: 41, partnerName: 'Binh Mentee', packageName: 'One-off sessions', subscriptionStatus: 'ONE_OFF', oneOffSessionCount: 1 },
  ], true);
  assert.match(markup, /Your mentees/);
  assert.match(markup, /data-workspace-messenger/);
  assert.match(markup, /id="workspace-list-filter"/);
  assert.match(markup, />All<\/option>/);
  assert.match(markup, /data-toggle-workspace-search/);
  assert.match(markup, /id="workspace-list-search"/);
  assert.match(markup, /Select a conversation/);
  assert.match(markup, /data-workspace-id="40"/);
  assert.match(markup, /data-workspace-id="41"/);
  assert.match(markup, /data-workspace-unread/);
  assert.doesNotMatch(markup, /id="workspace-message-form"/);
});

test('workspace list filter searches partner and package while preserving status options', () => {
  const workspaces = [
    { workspaceId: 40, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', hasMonthly: true },
    { workspaceId: 41, partnerName: 'Binh Mentee', packageName: 'One-off sessions', subscriptionStatus: 'ONE_OFF', oneOffSessionCount: 1 },
  ];
  assert.deepEqual(filterWorkspaceList(workspaces, 'ACTIVE').map(item => item.workspaceId), [40]);
  assert.deepEqual(filterWorkspaceList(workspaces, 'ALL', 'one-off').map(item => item.workspaceId), [41]);
  assert.deepEqual(filterWorkspaceList(workspaces, 'ONE_OFF').map(item => item.workspaceId), [41]);
});

test('selected mentorship keeps the conversation list beside messages and context', () => {
  const workspaces = [
    { workspaceId: 40, conversationId: 40, subscriptionId: 30, partnerName: 'An Mentee', packageName: 'Lite', subscriptionStatus: 'ACTIVE', hasMonthly: true, unreadCount: 2, currentPeriodEnd: '2026-11-12T00:00:00Z' },
    { workspaceId: 41, conversationId: 41, partnerName: 'Binh Mentee', packageName: 'One-off sessions', subscriptionStatus: 'ONE_OFF', oneOffSessionCount: 1 },
  ];
  const markup = workspaceConversationMarkup({
    ...workspaces[0],
    currentPeriodStart: '2026-10-12T00:00:00Z',
    callsPerPeriod: 2,
    sessionDurationMinutes: 45,
    learningGoals: 'Improve backend design.',
    oneOffSessions: [],
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
  assert.match(markup, /ENGAGEMENTS/);
  assert.match(markup, /Improve backend design\./);
});

test('one relationship workspace renders monthly and one-off engagements separately', () => {
  const markup = workspaceEngagementsMarkup({
    hasMonthly: true,
    packageName: 'Lite',
    subscriptionStatus: 'ACTIVE',
    currentPeriodStart: '2026-10-01T00:00:00Z',
    currentPeriodEnd: '2026-11-01T00:00:00Z',
    callsPerPeriod: 4,
    sessionDurationMinutes: 30,
    oneOffSessions: [{
      bookingId: 70,
      sessionName: 'Work Review',
      startAt: '2026-10-20T10:00:00Z',
      endAt: '2026-10-20T10:30:00Z',
      price: 180000,
      currency: 'VND',
      status: 'CONFIRMED',
      participants: 2,
    }],
  }, new Date('2026-10-16T00:00:00Z'));
  assert.match(markup, /Lite/);
  assert.match(markup, /Work Review/);
  assert.match(markup, /180\.000 VND/);
  assert.match(markup, /2 participants/);
});

test('ended one-off sessions leave upcoming engagements and remain in collapsed history', () => {
  const markup = workspaceEngagementsMarkup({
    hasMonthly: false,
    oneOffSessions: [
      {
        bookingId: 70,
        sessionName: 'Finished Review',
        startAt: '2026-10-16T10:00:00Z',
        endAt: '2026-10-16T10:30:00Z',
        price: 99000,
        currency: 'VND',
        status: 'CONFIRMED',
        participants: 1,
      },
      {
        bookingId: 71,
        sessionName: 'Upcoming Review',
        startAt: '2026-10-16T11:00:00Z',
        endAt: '2026-10-16T11:30:00Z',
        price: 180000,
        currency: 'VND',
        status: 'CONFIRMED',
        participants: 2,
      },
    ],
  }, new Date('2026-10-16T10:30:00Z'));

  assert.match(markup, /<details[^>]*>/);
  assert.doesNotMatch(markup, /<details[^>]*open/);
  assert.match(markup, /Past sessions/);
  assert.match(markup, /Finished Review/);
  assert.match(markup, /Completed/);
  assert.match(markup, /Upcoming Review/);
  assert.match(markup, /One-off sessions/);
});

test('completed unreviewed session renders review button for mentee, but not for mentor', () => {
  const menteeMarkup = workspaceEngagementsMarkup({
    hasMonthly: false,
    oneOffSessions: [{
      bookingId: 88,
      sessionName: 'System Architecture',
      startAt: '2026-10-16T09:00:00Z',
      endAt: '2026-10-16T10:00:00Z',
      price: 150000,
      currency: 'VND',
      status: 'COMPLETED',
      participants: 1,
    }],
  }, new Date('2026-10-16T11:00:00Z'), false);
  assert.match(menteeMarkup, /data-review-booking-id="88"/);
  assert.match(menteeMarkup, /Review mentor/);

  const mentorMarkup = workspaceEngagementsMarkup({
    hasMonthly: false,
    oneOffSessions: [{
      bookingId: 88,
      sessionName: 'System Architecture',
      startAt: '2026-10-16T09:00:00Z',
      endAt: '2026-10-16T10:00:00Z',
      price: 150000,
      currency: 'VND',
      status: 'COMPLETED',
      participants: 1,
    }],
  }, new Date('2026-10-16T11:00:00Z'), true);
  assert.doesNotMatch(mentorMarkup, /data-review-booking-id/);
});

test('reviewed session renders star rating and feedback badge instead of review button', () => {
  const markup = workspaceEngagementsMarkup({
    hasMonthly: false,
    oneOffSessions: [{
      bookingId: 99,
      sessionName: 'Database Tuning',
      startAt: '2026-10-16T08:00:00Z',
      endAt: '2026-10-16T09:00:00Z',
      price: 200000,
      currency: 'VND',
      status: 'COMPLETED',
      participants: 1,
      reviewId: 5,
      reviewRating: 5,
      reviewComment: 'Very knowledgeable mentor with great examples.',
    }],
  }, new Date('2026-10-16T11:00:00Z'), false);

  assert.match(markup, /data-session-reviewed="99"/);
  assert.match(markup, /Reviewed/);
  assert.match(markup, /\(5\.0\)/);
  assert.match(markup, /Very knowledgeable mentor with great examples\./);
  assert.doesNotMatch(markup, /data-review-booking-id/);
});

