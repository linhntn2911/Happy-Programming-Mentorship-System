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

export function workspaceMessages(messages = [], subscriptionId = '') {
  if (!messages.length) {
    return '<p class="py-10 text-center text-sm text-muted">No messages yet. Start by sharing what you want to work on first.</p>';
  }
  return messages.map(message => `<article class="flex ${message.mine ? 'justify-end' : 'justify-start'}">
    <div class="max-w-[85%] rounded-2xl border ${message.mine ? 'border-brand/30 bg-lilac' : 'border-line bg-white'} px-4 py-3 shadow-sm">
      <div class="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <strong class="text-ink">${esc(message.senderName || 'Member')}</strong>
        <span>${esc(dateLabel(message.sentAt))}</span>
        ${message.messageType === 'CODE' ? `<span class="rounded-full border border-line bg-cream px-2 py-0.5 font-mono">${esc(message.codeLanguage || 'code')}</span>` : ''}
      </div>
      ${message.messageType === 'FILE'
        ? `<a class="flex min-w-[220px] items-center gap-3 rounded-xl border border-line bg-white p-3 text-left hover:border-brand" href="${mentorshipWorkspaceService.downloadUrl(subscriptionId, message.id)}">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lilac text-lg text-brand" aria-hidden="true">↧</span>
            <span class="min-w-0"><strong class="block truncate text-sm text-ink">${esc(message.fileName || message.body || 'Attachment')}</strong><small class="text-muted">${esc(fileSizeLabel(message.fileSizeBytes))} · Download</small></span>
          </a>`
        : message.messageType === 'CODE'
        ? `<pre class="overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-left font-mono text-xs leading-5 text-white"><code>${esc(message.body)}</code></pre>`
        : `<p class="whitespace-pre-wrap text-sm leading-6 text-ink">${esc(message.body)}</p>`}
    </div>
  </article>`).join('');
}

function workspaceShell(user, isMentor) {
  const content = `<div class="admin-page-heading"><div><p class="eyebrow mb-3">PRIVATE MENTORSHIP</p><h1>Your mentorship workspace</h1><p>Keep learning goals, package context, and private messages together.</p></div></div>
    <div id="mentorship-workspace-root" role="status" aria-live="polite">Loading your workspace…</div>`;
  if (isMentor) return MentorLayout(content, user, 'mentorships');
  const name = user?.name || user?.email || 'Account';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header>
    <main class="min-h-screen bg-cream"><section class="container py-10 sm:py-14"><p class="eyebrow">PRIVATE MENTORSHIP</p><h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">Your mentorship workspace</h1><p class="mt-3 text-sm text-muted">Keep learning goals, package context, and private messages together.</p><div id="mentorship-workspace-root" class="mt-8" role="status" aria-live="polite">Loading your workspace…</div></section></main>`;
}

function detailMarkup(detail) {
  return `<button type="button" class="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline" data-workspace-back>← Back to mentorships</button>
  <div class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="space-y-5">
      <section class="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <p class="eyebrow">CURRENT MENTORSHIP</p>
        <h2 class="mt-2 font-display text-2xl text-ink">${esc(detail.partnerName)}</h2>
        <p class="mt-1 text-sm text-muted">${esc(detail.packageName)}</p>
        <span class="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">● ${esc(detail.subscriptionStatus)}</span>
        <dl class="mt-5 space-y-3 border-t border-line pt-4 text-xs">
          <div><dt class="text-muted">Current period</dt><dd class="mt-1 font-semibold text-ink">${esc(dateLabel(detail.currentPeriodStart))} – ${esc(dateLabel(detail.currentPeriodEnd))}</dd></div>
          <div><dt class="text-muted">Sessions included</dt><dd class="mt-1 font-semibold text-ink">${esc(detail.callsPerPeriod ?? '—')} / month</dd></div>
          <div><dt class="text-muted">Session length</dt><dd class="mt-1 font-semibold text-ink">${esc(detail.sessionDurationMinutes ?? '—')} minutes</dd></div>
        </dl>
      </section>
      <section class="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-ink">Learning goals</h2>
        <p class="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted">${esc(detail.learningGoals || 'No learning goals were provided.')}</p>
      </section>
    </aside>
    <section class="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-line bg-cream shadow-sm" aria-labelledby="conversation-heading">
      <header class="border-b border-line bg-white px-5 py-4"><h2 id="conversation-heading" class="font-display text-xl text-ink">Conversation with ${esc(detail.partnerName)}</h2><p class="mt-1 text-xs text-muted">Private to this mentorship. Messages refresh automatically.</p></header>
      <div id="workspace-messages" class="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">${workspaceMessages(detail.messages, detail.subscriptionId)}</div>
      <form id="workspace-message-form" class="border-t border-line bg-white p-4" novalidate>
        <label class="sr-only" for="workspace-message-body">Message</label>
        <textarea id="workspace-message-body" rows="3" maxlength="10000" required class="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink focus:border-brand focus:outline-none" placeholder="Write a message…"></textarea>
        <input id="workspace-file-input" type="file" class="sr-only" accept=".pdf,.zip,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp">
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><label for="workspace-file-input" class="btn btn-outline btn-sm cursor-pointer">Attach file</label><p id="workspace-send-status" class="text-xs text-muted" role="status">Files up to 10 MB.</p></div><button id="workspace-send" type="submit" class="btn btn-primary btn-sm">Send</button></div>
      </form>
    </section>
  </div>`;
}

export function workspaceListMarkup(workspaces, isMentor) {
  return `<section aria-labelledby="workspace-list-heading"><div class="mb-6"><p class="eyebrow">ACTIVE MENTORSHIPS</p><h2 id="workspace-list-heading" class="mt-2 font-display text-3xl text-ink">${isMentor ? 'Your mentees' : 'Your mentors'}</h2><p class="mt-2 text-sm text-muted">Choose a mentorship to open its private learning workspace.</p></div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${workspaces.map(item => `<button type="button" class="group rounded-2xl border border-line bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md" data-workspace-id="${esc(item.subscriptionId)}">
      <div class="flex items-start justify-between gap-3"><span class="grid h-11 w-11 place-items-center rounded-full bg-lilac font-semibold text-brand">${esc((item.partnerName || '?').split(/\s+/).map(part => part[0]).slice(-2).join(''))}</span><span class="flex items-center gap-2">${Number(item.unreadCount || 0) ? `<span class="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-bold text-white">${esc(item.unreadCount)} new</span>` : ''}<span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">● ${esc(item.subscriptionStatus)}</span></span></div>
      <h3 class="mt-4 font-display text-xl text-ink">${esc(item.partnerName)}</h3><p class="mt-1 text-xs text-muted">${esc(item.packageName)}</p>
      <div class="mt-4 border-t border-line pt-4 text-xs text-muted"><p>${esc(dateLabel(item.currentPeriodStart))} – ${esc(dateLabel(item.currentPeriodEnd))}</p><p class="mt-2 font-semibold text-brand">Open workspace →</p></div>
    </button>`).join('')}</div></section>`;
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
  let selectedId = Number(routeParams.get('subscriptionId')) || null;
  const requestedRequestId = Number(routeParams.get('requestId')) || null;
  let workspaces = [];
  let currentDetail = null;
  let pollTimer;
  let disposed = false;
  let lastReadMessageId = 0;

  const renderMessages = detail => {
    const messages = container.querySelector('#workspace-messages');
    if (!messages) return;
    messages.innerHTML = workspaceMessages(detail.messages, detail.subscriptionId);
    messages.scrollTop = messages.scrollHeight;
  };

  async function refreshMessages() {
    if (!selectedId || disposed || document.hidden) return;
    try {
      const detail = await mentorshipWorkspaceService.get(selectedId);
      if (disposed || detail.subscriptionId !== selectedId) return;
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
      await mentorshipWorkspaceService.markRead(detail.subscriptionId);
      lastReadMessageId = Math.max(0, ...(detail.messages || []).map(message => Number(message.id) || 0));
      workspaces = workspaces.map(item => item.subscriptionId === detail.subscriptionId
        ? { ...item, unreadCount: 0 } : item);
      window.dispatchEvent(new Event('workspace-unread-changed'));
    } catch {
      // A later refresh will retry without interrupting the conversation.
    }
  }

  function bindDetail(detail) {
    const form = container.querySelector('#workspace-message-form');
    const body = container.querySelector('#workspace-message-body');
    const fileInput = container.querySelector('#workspace-file-input');
    const status = container.querySelector('#workspace-send-status');
    const send = container.querySelector('#workspace-send');
    container.querySelector('[data-workspace-back]')?.addEventListener('click', showWorkspaceList);
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
        const created = await mentorshipWorkspaceService.upload(detail.subscriptionId, file, messageKey());
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
        const created = await mentorshipWorkspaceService.send(detail.subscriptionId, {
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
    if (pollTimer) clearInterval(pollTimer);
    container.innerHTML = '<div class="rounded-2xl border border-line bg-white p-8 text-sm text-muted">Loading conversation…</div>';
    try {
      currentDetail = await mentorshipWorkspaceService.get(selectedId);
      if (disposed) return;
      container.innerHTML = detailMarkup(currentDetail);
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
    if (pollTimer) clearInterval(pollTimer);
    container.innerHTML = workspaceListMarkup(workspaces, isMentor);
    container.querySelectorAll('[data-workspace-id]').forEach(button => {
      button.addEventListener('click', () => openWorkspace(button.dataset.workspaceId));
    });
  }

  try {
    workspaces = await mentorshipWorkspaceService.list();
    if (disposed) return () => {};
    if (!workspaces.length) { container.innerHTML = emptyState(); return () => cleanupLayout?.(); }
    if (!selectedId && requestedRequestId) {
      selectedId = workspaces.find(item => item.requestId === requestedRequestId)?.subscriptionId || null;
    }
    if (selectedId && workspaces.some(item => item.subscriptionId === selectedId)) await openWorkspace(selectedId);
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
