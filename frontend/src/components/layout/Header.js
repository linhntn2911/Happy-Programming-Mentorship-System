import { BrowseAllMentorsLink } from '../ui/BrowseAllMentorsLink.js';
import { mentorSkillOptions } from '../../constants/mentorDiscovery.js';
import { authService } from '../../services/authService.js';

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
        <span class="grid ${avatarSize} place-items-center rounded-full bg-brand font-bold text-white uppercase">${escapeHtml(initials)}</span>
        <span class="${textTruncate} truncate text-ink">${escapeHtml(displayName)}</span>
        <svg class="h-3.5 w-3.5 text-muted transition-transform duration-200 user-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <div class="user-dropdown-menu absolute right-0 mt-2 w-44 origin-top-right rounded-xl border border-line bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 hidden transition-all" role="menu">
        ${currentUser?.roles?.includes('MENTEE') || currentUser?.role === 'MENTEE' ? '<a href="#/account" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">My profile</a>' : ''}
        <a href="#/apply/mentor" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Mentor application</a>
        <a href="#/wishlist" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Wishlist</a>
        ${currentUser?.roles?.some(role => ['STAFF','ADMIN'].includes(role)) ? '<a href="#/staff/mentor-applications" class="block rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-lilac" role="menuitem">Review applications</a>' : ''}
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

  const authDesktopNav = currentUser
    ? renderUserDropdown({ currentUser, displayName, initials, isMobile: false })
    : `<a class="nav-link" href="#/login">Log in</a>`;

  const authMobileNav = currentUser
    ? renderUserDropdown({ currentUser, displayName, initials, isMobile: true })
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
      ${BrowseAllMentorsLink()}
    </nav>
    ${authMobileNav}
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

export function bindUserDropdown(root = document, onLogout = null) {
  const containers = root.querySelectorAll('.user-menu-container');
  if (!containers.length) return;

  function closeAllDropdowns() {
    containers.forEach(container => {
      const menu = container.querySelector('.user-dropdown-menu');
      const trigger = container.querySelector('.user-menu-trigger');
      const chevron = container.querySelector('.user-menu-chevron');
      if (menu) menu.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.classList.remove('rotate-180');
    });
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
          authService.clearCurrentUser();
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

  document.addEventListener('click', event => {
    if (!event.target.closest('.user-menu-container')) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAllDropdowns();
    }
  });
}
