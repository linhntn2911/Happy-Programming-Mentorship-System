import { BrandLogo } from './BrandLogo.js';
import { BrowseAllMentorsLink } from './BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from './Header.js';
import { mentorshipWorkspaceService } from './mentorshipWorkspaceService.js';
import { authService } from '../roles/auth/authService.js';
import { MentorLayout, bindMentorLayout } from '../roles/mentor/MentorLayout.js';

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const dateLabel = value => value
  ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' })
  : '—';
const messageTimeLabel = value => value
  ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Time unavailable';
const workspaceIdOf = item => Number(item?.workspaceId ?? item?.conversationId ?? item?.subscriptionId);
const dateTimeLabel = value => value
  ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Schedule unavailable';
const moneyLabel = (value, currency = 'VND') => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ${currency}`;

function emptyState() {
  return `<div class="rounded-2xl border border-line bg-white p-10 text-center shadow-sm">
    <h2 class="font-display text-2xl text-ink">No active mentorship workspace</h2>
    <p class="mt-3 text-sm text-muted">A workspace opens after a mentor accepts your application and SePay verifies the payment.</p>
    <a href="#/applications" class="btn btn-primary mt-6">View applications</a>
  </div>`;
}

const fileSizeLabel = bytes => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

function messageMatches(message, query) {
  if (!query) return true;
  const searchable = [message.body, message.fileName, message.senderName, message.codeLanguage]
    .filter(Boolean).join(' ').toLocaleLowerCase();
  return searchable.includes(query.toLocaleLowerCase());
}

function unreadMessageIds(messages, unreadCount) {
  const ids = new Set();
  let remaining = Math.max(0, Number(unreadCount) || 0);
  for (let index = messages.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const message = messages[index];
    if (!message.mine) {
      ids.add(Number(message.id));
      remaining -= 1;
    }
  }
  return ids;
}

export function workspaceMessages(messages = [], workspaceId = '', { query = '', unreadCount = 0 } = {}) {
  if (!messages.length) return `<div class="grid min-h-72 place-items-center px-6 py-12 text-center">
    <div><span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-lilac text-brand" aria-hidden="true"><svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8"><path d="M7 9h10M7 13h6"/><path d="M5 19l2.4-2.4A8 8 0 1 1 20 10a8 8 0 0 1-8 8H5Z"/></svg></span><p class="mt-4 font-semibold text-ink">Start the conversation</p><p class="mt-2 text-xs leading-5 text-muted">Share a goal, question, or learning resource with your mentorship partner.</p></div>
  </div>`;
  const normalizedQuery = query.trim();
  const visibleMessages = messages.filter(message => messageMatches(message, normalizedQuery));
  if (!visibleMessages.length) return `<div class="grid min-h-72 place-items-center px-6 py-12 text-center"><div><p class="font-semibold text-ink">No messages found</p><p class="mt-2 text-xs text-muted">No loaded message matches “${esc(normalizedQuery)}”.</p></div></div>`;
  const unreadIds = unreadMessageIds(messages, unreadCount);
  let dividerRendered = false;
  return visibleMessages.map(message => {
    const unread = !message.mine && unreadIds.has(Number(message.id));
    const divider = unread && !dividerRendered
      ? '<div class="flex items-center gap-3 py-1" data-unread-divider><span class="h-px flex-1 bg-brand/30"></span><span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">Unread messages</span><span class="h-px flex-1 bg-brand/30"></span></div>'
      : '';
    if (unread) dividerRendered = true;
    return `${divider}<article class="flex ${message.mine ? 'justify-end' : 'justify-start'}" ${unread ? 'data-unread-message="true"' : ''}>
    <div class="max-w-[85%] sm:max-w-[72%] rounded-2xl border ${message.mine ? 'rounded-br-md border-brand/30 bg-lilac' : 'rounded-bl-md border-line bg-white'} px-4 py-3 shadow-sm">
      <div class="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        <strong class="text-ink">${esc(message.senderName || 'Member')}</strong>
        <span>${esc(messageTimeLabel(message.sentAt))}</span>
        ${unread ? '<span class="h-1.5 w-1.5 rounded-full bg-brand" aria-label="Unread message"></span>' : ''}
        ${message.messageType === 'CODE' ? `<span class="rounded-full border border-line bg-cream px-2 py-0.5 font-mono">${esc(message.codeLanguage || 'code')}</span>` : ''}
      </div>
      ${message.messageType === 'FILE'
        ? `<a class="flex min-w-[220px] items-center gap-3 rounded-xl border border-line bg-white p-3 text-left hover:border-brand" href="${mentorshipWorkspaceService.downloadUrl(workspaceId, message.id)}">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lilac text-lg text-brand" aria-hidden="true">↧</span>
            <span class="min-w-0"><strong class="block truncate text-sm text-ink">${esc(message.fileName || message.body || 'Attachment')}</strong><small class="text-muted">${esc(fileSizeLabel(message.fileSizeBytes))} · Download</small></span>
          </a>`
        : message.messageType === 'CODE'
        ? `<pre class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-left font-mono text-xs leading-5 text-white"><code>${esc(message.body)}</code></pre>`
        : `<p class="whitespace-pre-wrap text-sm leading-6 text-ink">${esc(message.body)}</p>`}
    </div>
  </article>`;
  }).join('');
}

function workspaceShell(user, isMentor) {
  const content = `<div class="admin-page-heading"><div><p class="eyebrow mb-3">PRIVATE MENTORSHIP</p><h1>Your mentorship workspace</h1><p>Keep every mentorship conversation, learning goal, and shared file in one place.</p></div></div>
    <div id="mentorship-workspace-root" role="status" aria-live="polite">Loading your workspace…</div>`;
  if (isMentor) return MentorLayout(content, user, 'mentorships');
  const name = user?.name || user?.email || 'Account';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header>
    <main class="min-h-screen bg-cream"><section class="container py-10 sm:py-14"><p class="eyebrow">PRIVATE MENTORSHIP</p><h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">Your mentorship workspace</h1><p class="mt-3 text-sm text-muted">Keep every mentorship conversation, learning goal, and shared file in one place.</p><div id="mentorship-workspace-root" class="mt-8" role="status" aria-live="polite">Loading your workspace…</div></section></main>`;
}

const partnerInitials = name => (name || '?').trim().split(/\s+/).map(part => part[0]).slice(-2).join('').toUpperCase();

function workspaceListItems(workspaces, selectedId = null) {
  return workspaces.map(item => {
    const workspaceId = workspaceIdOf(item);
    const selected = workspaceId === Number(selectedId);
    const unread = Number(item.unreadCount || 0);
    const context = item.hasMonthly
      ? `${item.packageName} · ${item.subscriptionStatus}`
      : `${item.oneOffSessionCount || 0} one-off session${Number(item.oneOffSessionCount) === 1 ? '' : 's'}`;
    const timing = Number(item.upcomingSessionCount) > 0
      ? `Next session ${dateTimeLabel(item.nextSessionAt)}`
      : item.hasMonthly ? `Until ${dateLabel(item.currentPeriodEnd)}` : 'Session history available';
    return `<button type="button" class="flex w-full items-center gap-3 border-b border-line px-4 py-4 text-left transition hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand ${selected ? 'bg-lilac' : 'bg-white'}" data-workspace-id="${esc(workspaceId)}" ${selected ? 'aria-current="true"' : ''}>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full ${selected ? 'bg-white' : 'bg-lilac'} text-xs font-semibold text-brand">${esc(partnerInitials(item.partnerName))}</span>
      <span class="min-w-0 flex-1"><span class="flex items-center justify-between gap-2"><strong class="truncate text-sm text-ink">${esc(item.partnerName)}</strong>${unread ? `<span data-workspace-unread class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">${esc(unread)}</span>` : ''}</span><span class="mt-1 block truncate text-[11px] text-muted">${esc(context)}</span><span class="mt-1 block truncate text-[10px] text-muted">${esc(timing)}</span></span>
    </button>`;
  }).join('');
}

export function filterWorkspaceList(workspaces = [], status = 'ALL', query = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return workspaces.filter(item => {
    const statusMatches = status === 'ALL'
      || (status === 'ONE_OFF' && Number(item.oneOffSessionCount) > 0)
      || String(item.subscriptionStatus || '').toUpperCase() === status;
    const searchText = `${item.partnerName || ''} ${item.packageName || ''}`.toLocaleLowerCase();
    return statusMatches && (!normalizedQuery || searchText.includes(normalizedQuery));
  });
}

function workspaceListPanelMarkup(workspaces, isMentor, selectedId = null, status = 'ALL', query = '') {
  const visible = filterWorkspaceList(workspaces, status, query);
  return `<aside class="border-r border-line" aria-label="Mentorship conversations" data-workspace-list-panel>
    <div class="border-b border-line px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div><p class="text-xs font-semibold text-ink">${isMentor ? 'Your mentees' : 'Your mentors'}</p><p class="mt-1 text-[10px] text-muted"><span data-workspace-visible-count>${visible.length}</span> of ${workspaces.length} active mentorship${workspaces.length === 1 ? '' : 's'}</p></div>
        <div class="flex items-center gap-1.5">
          <label class="relative"><span class="sr-only">Filter mentorships</span><select id="workspace-list-filter" class="h-9 w-auto min-w-[68px] appearance-none rounded-lg border border-line bg-white px-2.5 pr-6 text-[11px] font-semibold text-ink focus:border-brand focus:outline-none"><option value="ALL" ${status === 'ALL' ? 'selected' : ''}>All</option><option value="ACTIVE" ${status === 'ACTIVE' ? 'selected' : ''}>Active</option><option value="TRIALING" ${status === 'TRIALING' ? 'selected' : ''}>Trialing</option><option value="ONE_OFF" ${status === 'ONE_OFF' ? 'selected' : ''}>One-off</option></select><span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted" aria-hidden="true">⌄</span></label>
          <button type="button" data-toggle-workspace-search class="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-lilac hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" aria-label="Search mentorships" aria-expanded="${query ? 'true' : 'false'}" aria-controls="workspace-list-search"><svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg></button>
        </div>
      </div>
      <div class="mt-2 ${query ? '' : 'hidden'}" data-workspace-search-wrap><label class="relative block"><span class="sr-only">Search mentorships</span><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-none stroke-muted" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="workspace-list-search" type="search" value="${esc(query)}" class="h-9 w-full rounded-lg border border-line bg-cream pl-8 pr-3 text-[11px] text-ink focus:border-brand focus:bg-white focus:outline-none" placeholder="Search name or package"></label></div>
    </div>
    <div data-workspace-list>${workspaceListItems(visible, selectedId)}</div><p data-workspace-no-results class="px-4 py-8 text-center text-[11px] text-muted" ${visible.length ? 'hidden' : ''}>No mentorships match this filter.</p>
  </aside>`;
}

export function workspaceListMarkup(workspaces, isMentor, status = 'ALL', query = '') {
  return `<section aria-labelledby="workspace-list-heading"><div class="mb-5"><p class="eyebrow">ACTIVE MENTORSHIPS</p><h2 id="workspace-list-heading" class="mt-2 font-display text-3xl text-ink">Messages</h2><p class="mt-2 text-sm text-muted">Choose ${isMentor ? 'a mentee' : 'a mentor'} to open the private mentorship conversation.</p></div>
    <div class="grid min-h-[620px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]" data-workspace-messenger>
      ${workspaceListPanelMarkup(workspaces, isMentor, null, status, query)}
      <div class="hidden place-items-center bg-cream px-8 text-center lg:grid"><div><span class="mx-auto grid h-16 w-16 place-items-center rounded-full border border-line bg-white text-brand shadow-sm" aria-hidden="true"><svg viewBox="0 0 24 24" class="h-7 w-7 fill-none stroke-current" stroke-width="1.7"><path d="M7 9h10M7 13h6"/><path d="M5 19l2.4-2.4A8 8 0 1 1 20 10a8 8 0 0 1-8 8H5Z"/></svg></span><h3 class="mt-5 font-display text-2xl text-ink">Select a conversation</h3><p class="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted">Open a mentorship to read messages, share files, and review the learning context.</p></div></div>
    </div></section>`;
}

const sessionStatusLabel = status => String(status || 'Completed')
  .toLocaleLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, letter => letter.toLocaleUpperCase());

function oneOffSessionCard(session, displayStatus = session.status) {
  const success = displayStatus === 'CONFIRMED' || displayStatus === 'COMPLETED';
  return `<article class="rounded-xl border border-line bg-white p-3"><div class="flex items-start justify-between gap-2"><div><h4 class="text-xs font-semibold text-ink">${esc(session.sessionName)}</h4><p class="mt-1 text-[10px] leading-4 text-muted">${esc(dateTimeLabel(session.startAt))} – ${esc(new Date(session.endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}</p></div><span class="status-badge ${success ? 'status-success' : 'status-neutral'}"><span aria-hidden="true">●</span>${esc(sessionStatusLabel(displayStatus))}</span></div><p class="mt-2 text-[10px] text-muted">${esc(moneyLabel(session.price, session.currency))} · ${esc(session.participants)} participant${Number(session.participants) === 1 ? '' : 's'}</p></article>`;
}

export function workspaceEngagementsMarkup(detail, now = new Date()) {
  const monthly = detail.hasMonthly ? `<section class="rounded-xl border border-line bg-cream p-4"><div class="flex items-center justify-between gap-2"><h4 class="text-xs font-semibold text-ink">${esc(detail.packageName || 'Monthly mentorship')}</h4><span class="status-badge status-success"><span aria-hidden="true">●</span>${esc(detail.subscriptionStatus)}</span></div><dl class="mt-3 space-y-2 text-[11px]"><div><dt class="text-muted">Current period</dt><dd class="mt-0.5 font-semibold text-ink">${esc(dateLabel(detail.currentPeriodStart))} – ${esc(dateLabel(detail.currentPeriodEnd))}</dd></div><div class="grid grid-cols-2 gap-3"><div><dt class="text-muted">Sessions</dt><dd class="mt-0.5 font-semibold text-ink">${esc(detail.callsPerPeriod ?? '—')} / month</dd></div><div><dt class="text-muted">Length</dt><dd class="mt-0.5 font-semibold text-ink">${esc(detail.sessionDurationMinutes ?? '—')} min</dd></div></div></dl></section>` : '';
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const sessions = detail.oneOffSessions || [];
  const upcoming = sessions.filter(session => session.status === 'CONFIRMED' && new Date(session.endAt).getTime() > nowTime);
  const past = sessions.filter(session => !upcoming.includes(session));
  const upcomingMarkup = upcoming.map(session => oneOffSessionCard(session)).join('');
  const pastMarkup = past.map(session => oneOffSessionCard(
    session,
    session.status === 'CONFIRMED' && new Date(session.endAt).getTime() <= nowTime ? 'COMPLETED' : session.status,
  )).join('');
  const upcomingSection = upcomingMarkup ? `<section><div class="mb-2 flex items-center justify-between gap-2"><h4 class="text-xs font-semibold text-ink">One-off sessions</h4><span class="rounded-full bg-lilac px-2 py-0.5 text-[10px] font-semibold text-brand">${esc(upcoming.length)}</span></div><div class="space-y-2">${upcomingMarkup}</div></section>` : '';
  const historySection = pastMarkup ? `<details class="group rounded-xl border border-line bg-cream"><summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-xs font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><span>Past sessions</span><span class="flex items-center gap-2"><span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand">${esc(past.length)}</span><span class="text-muted transition group-open:rotate-180" aria-hidden="true">⌄</span></span></summary><div class="space-y-2 border-t border-line p-2">${pastMarkup}</div></details>` : '';
  const oneOff = `${upcomingSection}${historySection}`;
  return `${monthly}${oneOff}` || '<p class="text-[11px] text-muted">No paid engagement details are available.</p>';
}

export function workspaceConversationMarkup(detail, workspaces, isMentor, status = 'ALL', query = '') {
  const detailWorkspaceId = workspaceIdOf(detail);
  const selectedSummary = workspaces.find(item => workspaceIdOf(item) === detailWorkspaceId);
  const initialUnreadCount = Number(selectedSummary?.unreadCount || 0);
  return `<section aria-labelledby="conversation-heading"><button type="button" class="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline lg:hidden" data-workspace-back>← All mentorships</button>
    <div class="grid min-h-[680px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_260px]" data-workspace-messenger>
      <div class="hidden lg:block">${workspaceListPanelMarkup(workspaces, isMentor, detailWorkspaceId, status, query)}</div>
      <section class="flex min-w-0 flex-col bg-cream" aria-labelledby="conversation-heading">
        <header class="flex items-center gap-3 border-b border-line bg-white px-5 py-4"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lilac text-xs font-semibold text-brand">${esc(partnerInitials(detail.partnerName))}</span><div class="min-w-0 flex-1"><h2 id="conversation-heading" class="truncate text-sm font-semibold text-ink">${esc(detail.partnerName)}</h2><p class="mt-1 truncate text-[10px] text-muted">${detail.hasMonthly ? esc(detail.packageName) : 'One-off mentorship'} · Private conversation</p></div><span class="status-badge status-success"><span aria-hidden="true">●</span>${detail.hasMonthly && detail.oneOffSessions?.length ? 'Monthly + sessions' : detail.hasMonthly ? esc(detail.subscriptionStatus) : 'One-off'}</span><div class="relative"><button id="workspace-conversation-actions" type="button" class="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:bg-lilac hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" aria-label="Conversation actions" aria-haspopup="menu" aria-expanded="false" aria-controls="workspace-conversation-menu"><svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button><div id="workspace-conversation-menu" class="absolute right-0 top-12 z-20 min-w-48 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-lg" role="menu" hidden><button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-ink hover:bg-lilac hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" role="menuitem" data-open-message-search><svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>Search messages</button></div></div></header>
        <div id="workspace-search-panel" class="border-b border-line bg-white px-5 py-3" hidden><div class="flex items-center gap-2"><label class="relative min-w-0 flex-1"><span class="sr-only">Search loaded messages</span><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="workspace-message-search" type="search" class="h-10 w-full rounded-lg border border-line bg-cream pl-9 pr-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none" placeholder="Search loaded messages" aria-controls="workspace-messages"></label><button type="button" class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-muted hover:bg-lilac hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" data-close-message-search aria-label="Close message search">×</button></div><p id="workspace-search-status" class="mt-2 text-right text-[10px] text-muted" aria-live="polite" hidden></p></div>
        <div id="workspace-messages" class="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">${workspaceMessages(detail.messages, detailWorkspaceId, { unreadCount: initialUnreadCount })}</div>
        <form id="workspace-message-form" class="border-t border-line bg-white p-4" novalidate>
          <label class="sr-only" for="workspace-message-body">Message</label>
          <div class="relative rounded-xl border border-line bg-cream focus-within:border-brand focus-within:bg-white"><textarea id="workspace-message-body" rows="1" maxlength="10000" required class="block min-h-11 w-full resize-none border-0 bg-transparent px-4 py-3 pr-14 text-sm text-ink focus:outline-none" placeholder="Write a message…"></textarea><button id="workspace-send" type="submit" class="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label="Send message" title="Send message"><svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2" aria-hidden="true"><path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z"/><path d="M10.2 13.8 21 3"/></svg></button></div>
          <input id="workspace-file-input" type="file" class="sr-only" accept=".pdf,.zip,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp">
          <div class="mt-2 flex flex-wrap items-center gap-3"><label for="workspace-file-input" class="btn btn-outline btn-sm cursor-pointer">Attach file</label><p id="workspace-send-status" class="truncate text-[10px] text-muted" role="status">Enter to send · Shift + Enter for a new line · Files up to 10 MB.</p></div>
        </form>
      </section>
      <aside class="hidden overflow-y-auto border-l border-line bg-white p-5 xl:block" aria-label="Mentorship details"><p class="eyebrow">ENGAGEMENTS</p><div class="mt-4 space-y-4">${workspaceEngagementsMarkup(detail)}</div>${detail.learningGoals ? `<div class="mt-5 border-t border-line pt-5"><h3 class="text-xs font-semibold text-ink">Learning goals</h3><p class="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-muted">${esc(detail.learningGoals)}</p></div>` : ''}</aside>
    </div></section>`;
}

function messageKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function mountMentorshipWorkspace(root) {
  document.title = 'Mentorship workspace | HappyProgramming';
  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = '<main class="min-h-screen bg-cream grid place-items-center p-8"><div class="text-center"><h1 class="font-display text-3xl text-ink">Log in to open your workspace</h1><a href="#/login" class="btn btn-primary mt-6">Log in</a></div></main>';
    return () => {};
  }
  const isMentor = user.role === 'MENTOR' || user.roles?.includes('MENTOR');
  root.innerHTML = workspaceShell(user, isMentor);
  const cleanupLayout = isMentor ? bindMentorLayout(root) : bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const container = root.querySelector('#mentorship-workspace-root');
  const routeParams = new URLSearchParams(location.hash.split('?')[1] || '');
  let selectedId = Number(routeParams.get('workspaceId') || routeParams.get('conversationId') || routeParams.get('subscriptionId')) || null;
  const requestedRequestId = Number(routeParams.get('requestId')) || null;
  let workspaces = [];
  let currentDetail = null;
  let pollTimer;
  let disposed = false;
  let lastReadMessageId = 0;
  let visibleUnreadCount = 0;
  let messageQuery = '';
  let workspaceFilter = 'ALL';
  let workspaceSearch = '';

  const renderMessages = detail => {
    const messages = container.querySelector('#workspace-messages');
    if (!messages) return;
    const search = container.querySelector('#workspace-message-search');
    const searchStatus = container.querySelector('#workspace-search-status');
    messageQuery = search?.value ?? messageQuery;
    const matchingCount = (detail.messages || []).filter(message => messageMatches(message, messageQuery.trim())).length;
    messages.innerHTML = workspaceMessages(detail.messages, workspaceIdOf(detail), {
      query: messageQuery,
      unreadCount: visibleUnreadCount,
    });
    if (searchStatus) {
      searchStatus.hidden = !messageQuery.trim();
      searchStatus.textContent = messageQuery.trim()
        ? `${matchingCount} matching message${matchingCount === 1 ? '' : 's'} in the latest loaded history`
        : '';
    }
    messages.scrollTop = messageQuery.trim() ? 0 : messages.scrollHeight;
  };

  async function refreshMessages() {
    if (!selectedId || disposed || document.hidden) return;
    try {
      const detail = await mentorshipWorkspaceService.get(selectedId);
      if (disposed || workspaceIdOf(detail) !== selectedId) return;
      const newlyUnread = (detail.messages || [])
        .filter(message => !message.mine && Number(message.id) > lastReadMessageId).length;
      if (newlyUnread > 0) visibleUnreadCount = newlyUnread;
      currentDetail = detail;
      renderMessages(detail);
      const newestIncoming = [...(detail.messages || [])].reverse().find(message => !message.mine);
      if (newestIncoming && Number(newestIncoming.id) > lastReadMessageId) {
        await markCurrentRead(detail);
      }
    } catch {
      // Keep the current workspace usable; the next interval can recover.
    }
  }

  async function markCurrentRead(detail) {
    try {
      const workspaceId = workspaceIdOf(detail);
      await mentorshipWorkspaceService.markRead(workspaceId);
      lastReadMessageId = Math.max(0, ...(detail.messages || []).map(message => Number(message.id) || 0));
      workspaces = workspaces.map(item => workspaceIdOf(item) === workspaceId
        ? { ...item, unreadCount: 0 } : item);
      for (const button of container.querySelectorAll('[data-workspace-id]')) {
        if (Number(button.dataset.workspaceId) === workspaceId) {
          button.querySelector('[data-workspace-unread]')?.remove();
        }
      }
      window.dispatchEvent(new Event('workspace-unread-changed'));
    } catch {
      // A later refresh will retry without interrupting the conversation.
    }
  }

  function bindWorkspaceListControls() {
    const panel = container.querySelector('[data-workspace-list-panel]');
    if (!panel) return;
    const list = panel.querySelector('[data-workspace-list]');
    const noResults = panel.querySelector('[data-workspace-no-results]');
    const visibleCount = panel.querySelector('[data-workspace-visible-count]');
    const filter = panel.querySelector('#workspace-list-filter');
    const search = panel.querySelector('#workspace-list-search');
    const searchWrap = panel.querySelector('[data-workspace-search-wrap]');
    const toggleSearch = panel.querySelector('[data-toggle-workspace-search]');
    const renderList = () => {
      const visible = filterWorkspaceList(workspaces, workspaceFilter, workspaceSearch);
      list.innerHTML = workspaceListItems(visible, selectedId);
      visibleCount.textContent = String(visible.length);
      noResults.hidden = visible.length > 0;
      list.querySelectorAll('[data-workspace-id]').forEach(button => {
        button.addEventListener('click', () => {
          if (Number(button.dataset.workspaceId) !== Number(selectedId)) void openWorkspace(button.dataset.workspaceId);
        });
      });
    };
    filter.value = workspaceFilter;
    search?.addEventListener('input', () => {
      workspaceSearch = search.value;
      renderList();
    });
    filter.addEventListener('change', () => {
      workspaceFilter = filter.value;
      renderList();
    });
    toggleSearch?.addEventListener('click', () => {
      const willOpen = searchWrap.classList.contains('hidden');
      searchWrap.classList.toggle('hidden', !willOpen);
      toggleSearch.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) search?.focus();
      else {
        workspaceSearch = '';
        if (search) search.value = '';
        renderList();
      }
    });
    renderList();
  }

  function bindDetail(detail) {
    const form = container.querySelector('#workspace-message-form');
    const body = container.querySelector('#workspace-message-body');
    const fileInput = container.querySelector('#workspace-file-input');
    const status = container.querySelector('#workspace-send-status');
    const send = container.querySelector('#workspace-send');
    const search = container.querySelector('#workspace-message-search');
    const searchPanel = container.querySelector('#workspace-search-panel');
    const actionsButton = container.querySelector('#workspace-conversation-actions');
    const actionsMenu = container.querySelector('#workspace-conversation-menu');
    const openSearchButton = container.querySelector('[data-open-message-search]');
    const closeSearchButton = container.querySelector('[data-close-message-search]');
    search?.addEventListener('input', () => renderMessages(currentDetail));
    body.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !send.disabled) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    actionsButton?.addEventListener('click', () => {
      const willOpen = actionsMenu.hidden;
      actionsMenu.hidden = !willOpen;
      actionsButton.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) openSearchButton?.focus();
    });
    openSearchButton?.addEventListener('click', () => {
      actionsMenu.hidden = true;
      actionsButton.setAttribute('aria-expanded', 'false');
      searchPanel.hidden = false;
      search?.focus();
    });
    closeSearchButton?.addEventListener('click', () => {
      search.value = '';
      messageQuery = '';
      searchPanel.hidden = true;
      renderMessages(currentDetail);
      actionsButton?.focus();
    });
    actionsMenu?.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        actionsMenu.hidden = true;
        actionsButton.setAttribute('aria-expanded', 'false');
        actionsButton.focus();
      }
    });
    container.querySelector('[data-workspace-back]')?.addEventListener('click', showWorkspaceList);
    bindWorkspaceListControls();
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        status.textContent = 'Files must be 10 MB or smaller.';
        fileInput.value = '';
        return;
      }
      fileInput.disabled = true;
      send.disabled = true;
      status.textContent = `Uploading ${file.name}…`;
      try {
        const created = await mentorshipWorkspaceService.upload(workspaceIdOf(detail), file, messageKey());
        currentDetail = { ...currentDetail, messages: [...(currentDetail.messages || []), created] };
        renderMessages(currentDetail);
        status.textContent = 'File uploaded.';
      } catch (error) {
        status.textContent = error.message || 'Could not upload the file.';
      } finally {
        fileInput.value = '';
        fileInput.disabled = false;
        send.disabled = false;
      }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const messageBody = body.value.trim();
      if (!messageBody) { status.textContent = 'Write a message first.'; return; }
      send.disabled = true;
      status.textContent = 'Sending…';
      try {
        const created = await mentorshipWorkspaceService.send(workspaceIdOf(detail), {
          clientMessageKey: messageKey(), messageType: 'TEXT', body: messageBody, codeLanguage: null,
        });
        body.value = '';
        currentDetail = { ...currentDetail, messages: [...(currentDetail.messages || []), created] };
        renderMessages(currentDetail);
        status.textContent = 'Message sent.';
      } catch (error) {
        status.textContent = error.message || 'Could not send the message.';
      } finally {
        send.disabled = false;
      }
    });
  }

  async function openWorkspace(id) {
    selectedId = Number(id);
    messageQuery = '';
    visibleUnreadCount = Number(workspaces.find(item => workspaceIdOf(item) === selectedId)?.unreadCount || 0);
    if (pollTimer) clearInterval(pollTimer);
    container.innerHTML = '<div class="rounded-2xl border border-line bg-white p-8 text-sm text-muted">Loading conversation…</div>';
    try {
      currentDetail = await mentorshipWorkspaceService.get(selectedId);
      if (disposed) return;
      container.innerHTML = workspaceConversationMarkup(currentDetail, workspaces, isMentor, workspaceFilter, workspaceSearch);
      bindDetail(currentDetail);
      renderMessages(currentDetail);
      await markCurrentRead(currentDetail);
      pollTimer = setInterval(refreshMessages, 5000);
    } catch (error) {
      container.innerHTML = `<div class="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">${esc(error.message || 'Could not load this workspace.')}</div>`;
    }
  }

  function showWorkspaceList() {
    selectedId = null;
    currentDetail = null;
    lastReadMessageId = 0;
    visibleUnreadCount = 0;
    messageQuery = '';
    if (pollTimer) clearInterval(pollTimer);
    container.innerHTML = workspaceListMarkup(workspaces, isMentor, workspaceFilter, workspaceSearch);
    bindWorkspaceListControls();
  }

  try {
    workspaces = await mentorshipWorkspaceService.list();
    if (disposed) return () => {};
    if (!workspaces.length) { container.innerHTML = emptyState(); return () => cleanupLayout?.(); }
    if (!selectedId && requestedRequestId) {
      selectedId = workspaceIdOf(workspaces.find(item => Number(item.requestId) === requestedRequestId)) || null;
    }
    if (selectedId && workspaces.some(item => workspaceIdOf(item) === selectedId)) await openWorkspace(selectedId);
    else showWorkspaceList();
  } catch (error) {
    container.innerHTML = `<div class="rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert"><h2 class="font-display text-2xl text-ink">Could not load your workspace</h2><p class="mt-3 text-sm text-red-800">${esc(error.message || 'Please try again.')}</p><button type="button" class="btn btn-outline mt-5" data-workspace-retry>Try again</button></div>`;
    container.querySelector('[data-workspace-retry]')?.addEventListener('click', () => window.location.reload());
  }

  return () => {
    disposed = true;
    if (pollTimer) clearInterval(pollTimer);
    cleanupLayout?.();
  };
}
