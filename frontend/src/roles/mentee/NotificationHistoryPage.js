import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { notificationService } from './notificationService.js';
import { safeNotificationHref } from '../../shared/notificationLink.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const PAGE_SIZE = 10;

function notificationRow(item) {
  const href = safeNotificationHref(item.actionUrl);
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return `<article class="rounded-xl border border-line ${item.read ? 'bg-white' : 'bg-lilac/30'} p-5" data-notification-id="${esc(item.id)}">
    <div class="flex flex-wrap items-start justify-between gap-3"><div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full ${item.read ? 'bg-transparent' : 'bg-brand'}" aria-hidden="true"></span><h2 class="text-sm font-semibold text-ink">${esc(item.title || 'Notification')}</h2>${item.read ? '' : '<span class="rounded-full bg-lilac px-2 py-0.5 text-[10px] font-semibold text-brand">Unread</span>'}</div><time class="text-xs text-muted">${esc(date)}</time></div>
    <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">${esc(item.message || '')}</p>
    <div class="mt-4 flex flex-wrap gap-4">${item.read ? '' : '<button type="button" data-mark-read class="text-xs font-semibold text-brand hover:underline">Mark as read</button>'}${href ? `<a href="${esc(href)}" data-open-notification class="text-xs font-semibold text-brand hover:underline">Open related page →</a>` : ''}</div>
  </article>`;
}

export async function mountNotificationHistory(root) {
  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = '<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><h1 class="font-display text-4xl">Notifications</h1><p class="mt-4 text-muted">Log in to see your notification history.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>';
    return;
  }
  const name = user.name || user.email || 'Account';
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="font-semibold text-brand">{h} HappyProgramming</a><nav class="flex items-center gap-3">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header>
    <main class="min-h-screen bg-cream"><section class="container max-w-4xl py-12 sm:py-16"><p class="eyebrow">YOUR UPDATES</p><h1 class="mt-3 font-display text-4xl sm:text-5xl">Notification history</h1><p class="mt-4 text-sm text-muted">Review your updates and keep track of what you have read.</p>
    <div class="mt-9 flex flex-wrap items-center justify-between gap-3"><div class="flex gap-2" role="group" aria-label="Filter notifications"><button type="button" data-notification-filter="all" class="btn btn-primary btn-sm" aria-pressed="true">All</button><button type="button" data-notification-filter="unread" class="btn btn-outline btn-sm" aria-pressed="false">Unread</button></div><button type="button" id="notifications-mark-all" class="btn btn-outline btn-sm" disabled>Mark all as read</button></div>
    <div id="notification-history-state" class="mt-6" role="status" aria-live="polite">Loading notifications…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const state = root.querySelector('#notification-history-state');
  const markAll = root.querySelector('#notifications-mark-all');
  let page = 0;
  let unreadOnly = false;
  let items = [];
  let request = 0;

  async function load() {
    const current = ++request;
    state.textContent = 'Loading notifications…';
    try {
      const result = await notificationService.getHistory({ page, size: PAGE_SIZE, unreadOnly });
      if (current !== request || root.querySelector('#notification-history-state') !== state) return;
      if (result.totalPages > 0 && page >= result.totalPages) { page = result.totalPages - 1; load(); return; }
      items = result.notifications || [];
      markAll.disabled = !result.unreadCount;
      root.querySelectorAll('.notification-badge').forEach(badge => {
        badge.textContent = result.unreadCount > 99 ? '99+' : String(result.unreadCount);
        badge.classList.toggle('hidden', !result.unreadCount);
      });
      root.querySelectorAll('.notification-count-tag').forEach(tag => { tag.textContent = `${result.unreadCount} new`; });
      const totalPages = result.totalPages || 0;
      const emptyText = unreadOnly ? 'You have no unread notifications.' : 'No notifications yet.';
      state.innerHTML = `<p class="mb-4 text-xs text-muted">${result.unreadCount} unread · ${result.totalElements} ${unreadOnly ? 'unread ' : ''}notification${result.totalElements === 1 ? '' : 's'}</p>
        ${items.length ? `<div class="space-y-3">${items.map(notificationRow).join('')}</div>` : `<div class="directory-message"><h2>${emptyText}</h2><p>New updates will appear here when available.</p></div>`}
        ${totalPages > 1 ? `<nav class="mt-7 flex items-center justify-between gap-3" aria-label="Notification pages"><button type="button" data-page="previous" class="btn btn-outline btn-sm" ${page === 0 ? 'disabled' : ''}>← Previous</button><span class="text-xs text-muted">Page ${page + 1} of ${totalPages}</span><button type="button" data-page="next" class="btn btn-outline btn-sm" ${page + 1 >= totalPages ? 'disabled' : ''}>Next →</button></nav>` : ''}`;
    } catch (error) {
      if (current !== request || root.querySelector('#notification-history-state') !== state) return;
      state.innerHTML = `<div class="directory-message"><h2>Could not load notifications</h2><p>${esc(error.message || 'Please try again.')}</p><button type="button" data-retry class="btn btn-outline btn-sm mt-5">Try again</button></div>`;
    }
  }

  root.querySelectorAll('[data-notification-filter]').forEach(button => button.addEventListener('click', () => {
    unreadOnly = button.dataset.notificationFilter === 'unread';
    page = 0;
    root.querySelectorAll('[data-notification-filter]').forEach(option => {
      const active = option === button;
      option.classList.toggle('btn-primary', active);
      option.classList.toggle('btn-outline', !active);
      option.setAttribute('aria-pressed', String(active));
    });
    load();
  }));
  markAll.addEventListener('click', async () => {
    markAll.disabled = true;
    const updated = await notificationService.markAllAsRead();
    if (!updated) { state.insertAdjacentHTML('afterbegin', '<p class="mb-4 text-sm text-red-600">Could not mark notifications as read. Please try again.</p>'); markAll.disabled = false; return; }
    page = 0;
    load();
  });
  state.addEventListener('click', async event => {
    if (event.target.closest('[data-retry]')) { load(); return; }
    const pagination = event.target.closest('[data-page]');
    if (pagination) { page += pagination.dataset.page === 'next' ? 1 : -1; load(); return; }
    const card = event.target.closest('[data-notification-id]');
    if (!card) return;
    const item = items.find(entry => String(entry.id) === card.dataset.notificationId);
    if (!item || item.read) return;
    const open = event.target.closest('[data-open-notification]');
    const button = event.target.closest('[data-mark-read]');
    if (!open && !button) return;
    if (open) event.preventDefault();
    if (button) button.disabled = true;
    const success = await notificationService.markAsRead(item.id);
    if (!success) { state.insertAdjacentHTML('afterbegin', '<p class="mb-4 text-sm text-red-600">Could not mark this notification as read. Please try again.</p>'); if (button) button.disabled = false; return; }
    if (open) { location.hash = safeNotificationHref(item.actionUrl); return; }
    load();
  });
  load();
}
