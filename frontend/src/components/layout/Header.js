import { BrowseAllMentorsLink } from '../ui/BrowseAllMentorsLink.js';
import { mentorSkillOptions } from '../../constants/mentorDiscovery.js';
import { authService } from '../../services/authService.js';
import { notificationService } from '../../services/notificationService.js';
import { profileService } from '../../services/profileService.js';
import { safeNotificationHref } from '../../utils/notificationLink.js';

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now - date) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderNotificationItems(items = []) {
  if (!items.length) {
    return '<div class="p-6 text-center text-xs text-muted">No notifications yet</div>';
  }

  return items.map(item => {
    const isUnread = !item.read;
    const timeAgo = formatRelativeTime(item.createdAt);
    const href = escapeHtml(safeNotificationHref(item.actionUrl) || '#/notifications');
    const bgClass = isUnread ? 'bg-lilac/30 hover:bg-lilac/50' : 'bg-white hover:bg-cream';
    const dotClass = isUnread ? '<span class="h-2 w-2 rounded-full bg-brand shrink-0"></span>' : '';

    return `
      <a href="${href}" class="notification-item flex items-start gap-3 px-4 py-3 transition-colors ${bgClass} cursor-pointer block text-left" data-id="${escapeHtml(item.id)}" data-url="${href}">
        <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUnread ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-muted'}">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-ink truncate">${escapeHtml(item.title || 'Notification')}</p>
            ${dotClass}
          </div>
          <p class="mt-0.5 text-xs text-muted line-clamp-2 leading-relaxed">${escapeHtml(item.message || '')}</p>
          <span class="mt-1 block text-[10px] text-muted/80">${escapeHtml(timeAgo)}</span>
        </div>
      </a>
    `;
  }).join('');
}

export function renderNotificationBell({ isMobile = false } = {}) {
  const containerClass = isMobile ? 'shrink-0 lg:hidden' : 'hidden lg:block';
  return `
    <div class="relative notification-bell-container ${containerClass}">
      <button type="button" class="notification-bell-trigger relative flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-2xs hover:border-brand/40 hover:bg-lilac/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30" aria-expanded="false" aria-haspopup="true" aria-label="Notifications">
        <svg class="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notification-badge hidden absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white shadow-sm">0</span>
      </button>
      <div class="notification-dropdown-menu absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-line bg-white shadow-xl ring-1 ring-black/5 z-50 hidden transition-all" role="dialog" aria-label="Notifications list">
        <div class="flex items-center justify-between border-b border-line px-4 py-3 bg-cream/60 rounded-t-2xl">
          <div class="flex items-center gap-2">
            <span class="font-display text-sm font-semibold text-ink">Notifications</span>
            <span class="notification-count-tag text-[10px] font-bold text-brand bg-lilac px-2 py-0.5 rounded-full">0 new</span>
          </div>
          <button type="button" class="mark-all-read-btn text-[11px] font-semibold text-brand hover:underline cursor-pointer">Mark all read</button>
        </div>
        <div class="notification-list max-h-80 overflow-y-auto divide-y divide-line/60">
          <div class="p-6 text-center text-xs text-muted">Loading notifications…</div>
        </div>
        <a href="#/notifications" class="block rounded-b-2xl border-t border-line px-4 py-3 text-center text-xs font-semibold text-brand hover:bg-lilac/30">View all notifications</a>
      </div>
    </div>
  `;
}

export function renderUserDropdown({ currentUser, displayName, initials, isMobile = false }) {
  const roleLabel = currentUser?.role === 'MENTOR' ? 'Mentor' : 'Mentee';
  const avatarSize = isMobile ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs';
  const triggerPadding = isMobile ? 'p-1 pr-2 text-xs' : 'py-1 pl-2 pr-3 text-xs';
  const textTruncate = isMobile ? 'max-w-[90px]' : 'max-w-[140px]';
  const menuWidth = isMobile ? 'w-56' : 'w-64';

  return `
    <div class="relative user-menu-container ${isMobile ? 'shrink-0 lg:hidden' : 'hidden lg:block'}">
      <button type="button" class="user-menu-trigger flex items-center gap-2 rounded-full border border-line bg-white ${triggerPadding} font-semibold text-ink shadow-2xs hover:border-brand/40 hover:bg-lilac/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30" aria-expanded="false" aria-haspopup="true" aria-label="User menu for ${escapeHtml(displayName)}">
        <span data-account-avatar class="grid ${avatarSize} place-items-center overflow-hidden rounded-full bg-brand font-bold text-white uppercase">${escapeHtml(initials)}</span>
        <span class="${textTruncate} truncate text-ink">${escapeHtml(displayName)}</span>
        <svg class="h-3.5 w-3.5 text-muted transition-transform duration-200 user-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <div class="user-dropdown-menu absolute right-0 mt-2 w-44 origin-top-right rounded-xl border border-line bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 hidden transition-all" role="menu">
        ${currentUser?.roles?.includes('MENTEE') || currentUser?.role === 'MENTEE' ? '<a href="#/account" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">My profile</a>' : ''}
        <a href="#/apply/mentor" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Mentor application</a>
        <a href="#/wishlist" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Wishlist</a>
        ${currentUser?.roles?.some(role => ['STAFF','ADMIN'].includes(role)) || ['STAFF','ADMIN'].includes(currentUser?.role) ? '<a href="#/staff/dashboard" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Staff Dashboard</a>' : ''}
        <button type="button" class="user-logout-btn flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left" role="menuitem">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Log out</span>
        </button>
      </div>
    </div>
  `;
}

export function Header(mentors = [], user = null) {
  const currentUser = user || authService.getCurrentUser();
  const displayName = currentUser?.name || currentUser?.email || '';
  const initials = getInitials(displayName);
  const isMentor = currentUser?.role === 'MENTOR' || currentUser?.roles?.includes('MENTOR');

  const authDesktopNav = currentUser
    ? `<div class="flex items-center gap-3">
        ${renderNotificationBell({ isMobile: false })}
        ${renderUserDropdown({ currentUser, displayName, initials, isMobile: false })}
       </div>`
    : `<a class="nav-link" href="#/login">Log in</a>`;

  const authMobileNav = currentUser
    ? `<div class="flex items-center gap-2">
        ${renderNotificationBell({ isMobile: true })}
        ${renderUserDropdown({ currentUser, displayName, initials, isMobile: true })}
       </div>`
    : `<a href="#/login" class="nav-link shrink-0 lg:hidden">Log in</a>`;

  return `
<header class="relative z-10 hero-shell">
  <div class="container flex h-[86px] items-center justify-between gap-6">
    <a href="#/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home">
      <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span>
      <span class="text-[16px] font-semibold tracking-tight">Happy<span class="text-brand">Programming</span></span>
    </a>
    <nav class="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
      <a class="nav-link" href="#how-it-works">How it works</a>
      ${authDesktopNav}
      ${isMentor ? '<a class="nav-link" href="#/mentor/dashboard">Mentor dashboard</a><a class="nav-link" href="#/mentor/profile">Mentor profile</a>' : ''}
      ${BrowseAllMentorsLink()}
    </nav>
    <div class="flex items-center gap-2 lg:hidden">
      ${authMobileNav}
      ${isMentor ? '<a href="#/mentor/dashboard" class="btn btn-outline btn-sm">Dashboard</a>' : ''}
    </div>
  </div>

  <!-- Centered Category Bar matching HappyProgramming tone -->
  <nav class="container" aria-label="Mentor skills">
    <div class="mc-category-bar relative border-t border-brand/10 py-2.5">
      <!-- Left Double Chevron Button -->
      <button id="cat-scroll-left" class="cat-nav-btn cat-nav-left mr-2.5 hidden" aria-label="Scroll skills left">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m11 17-5-5 5-5m7 10-5-5 5-5"/>
        </svg>
      </button>

      <!-- Scrollable Categories Track (Centered) -->
      <div id="cat-scroll-track" class="cat-scroll-track">
        ${mentorSkillOptions(mentors).map(([skill]) => `<a class="cat-item" href="?${escapeHtml(new URLSearchParams({ skills: skill }).toString())}#/mentors">${escapeHtml(skill)}</a>`).join('') }
      </div>

      <!-- Right Double Chevron Button -->
      <button id="cat-scroll-right" class="cat-nav-btn cat-nav-right ml-2.5" aria-label="Scroll skills right">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m13 7 5 5-5 5M6 7l5 5-5 5"/>
        </svg>
      </button>
    </div>
  </nav>
</header>
  `;
}

export function bindNotificationBell(root = document) {
  const bellContainers = root.querySelectorAll('.notification-bell-container');
  if (!bellContainers.length) return;

  function closeAllNotificationMenus() {
    bellContainers.forEach(container => {
      const menu = container.querySelector('.notification-dropdown-menu');
      const trigger = container.querySelector('.notification-bell-trigger');
      if (menu) menu.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function bindItemEvents(listEl) {
    listEl.querySelectorAll('.notification-item').forEach(itemEl => {
      itemEl.addEventListener('click', async () => {
        const id = itemEl.dataset.id;
        const url = itemEl.dataset.url;
        if (id) {
          await notificationService.markAsRead(id);
        }
        closeAllNotificationMenus();
        if (url && url !== '#') {
          window.location.hash = url;
        }
      });
    });
  }

  async function refreshBell() {
    const data = await notificationService.getNotifications();
    const unreadCount = data?.unreadCount || 0;
    const list = data?.notifications || [];

    bellContainers.forEach(container => {
      const badge = container.querySelector('.notification-badge');
      const countTag = container.querySelector('.notification-count-tag');
      const listEl = container.querySelector('.notification-list');

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
      if (countTag) {
        countTag.textContent = `${unreadCount} new`;
      }
      if (listEl) {
        listEl.innerHTML = renderNotificationItems(list);
        bindItemEvents(listEl);
      }
    });
  }

  bellContainers.forEach(container => {
    const trigger = container.querySelector('.notification-bell-trigger');
    const menu = container.querySelector('.notification-dropdown-menu');
    const markAllBtn = container.querySelector('.mark-all-read-btn');

    if (trigger && menu) {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        // Close user dropdown menus if any
        root.querySelectorAll('.user-dropdown-menu').forEach(m => m.classList.add('hidden'));
        closeAllNotificationMenus();
        if (isHidden) {
          menu.classList.remove('hidden');
          trigger.setAttribute('aria-expanded', 'true');
          refreshBell();
        }
      });
    }

    if (markAllBtn) {
      markAllBtn.addEventListener('click', async event => {
        event.stopPropagation();
        await notificationService.markAllAsRead();
        await refreshBell();
      });
    }
  });

  // Fetch initial unread count on mount
  refreshBell();
}

export async function refreshUserMenuAvatar(root = document) {
  const placeholders = [...root.querySelectorAll('[data-account-avatar]')];
  const user = authService.getCurrentUser();
  if (!placeholders.length || !(user?.roles?.includes('MENTEE') || user?.role === 'MENTEE')) return;
  let profile;
  try { profile = await profileService.get(); } catch { return; }
  for (const placeholder of placeholders) {
    if (!placeholder.isConnected) continue;
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.name || user.email;
    placeholder.textContent = getInitials(name);
    if (!profile.hasAvatar) continue;
    const img = new Image();
    img.alt = '';
    img.className = 'h-full w-full object-cover';
    img.onload = () => { if (placeholder.isConnected) placeholder.replaceChildren(img); };
    img.src = `/api/profile/me/avatar?v=${Date.now()}`;
  }
}

export function bindUserDropdown(root = document, onLogout = null) {
  const containers = root.querySelectorAll('.user-menu-container');
  refreshUserMenuAvatar(root);

  function closeAllDropdowns() {
    containers.forEach(container => {
      const menu = container.querySelector('.user-dropdown-menu');
      const trigger = container.querySelector('.user-menu-trigger');
      const chevron = container.querySelector('.user-menu-chevron');
      if (menu) menu.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.classList.remove('rotate-180');
    });
    root.querySelectorAll('.notification-dropdown-menu').forEach(m => m.classList.add('hidden'));
    root.querySelectorAll('.notification-bell-trigger').forEach(t => t.setAttribute('aria-expanded', 'false'));
  }

  containers.forEach(container => {
    const trigger = container.querySelector('.user-menu-trigger');
    const menu = container.querySelector('.user-dropdown-menu');
    const chevron = container.querySelector('.user-menu-chevron');
    const logoutBtn = container.querySelector('.user-logout-btn');

    if (trigger && menu) {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        closeAllDropdowns();
        if (isHidden) {
          menu.classList.remove('hidden');
          trigger.setAttribute('aria-expanded', 'true');
          if (chevron) chevron.classList.add('rotate-180');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async event => {
        event.stopPropagation();
        logoutBtn.disabled = true;
        const span = logoutBtn.querySelector('span');
        if (span) span.textContent = 'Logging out…';
        try {
          await authService.logout();
        } catch {
          logoutBtn.disabled = false;
          if (span) span.textContent = 'Logout failed. Try again';
          return;
        }
        closeAllDropdowns();
        if (typeof onLogout === 'function') {
          onLogout();
        } else {
          location.hash = '#/';
          location.reload();
        }
      });
    }
  });

  // Bind notification bell on the same root
  bindNotificationBell(root);

  document.addEventListener('click', event => {
    if (!event.target.closest('.user-menu-container') && !event.target.closest('.notification-bell-container')) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAllDropdowns();
    }
  });
}

