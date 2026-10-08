import { escapeHtml as e } from '../../utils/html.js';
import { adminIcon } from './AdminLayout.js';
import { authService } from '../../services/authService.js';

const sections = [
  ['dashboard', 'Overview', '#/mentor/dashboard', 'overview'],
  ['profile', 'Edit profile', '#/mentor/profile', 'users'],
  ['availability', 'Availability', '#/mentor/availability', 'audit'],
  ['packages', 'Packages', '#/mentor/packages', 'settings'],
];

export function MentorLayout(content, user = null, section = 'dashboard') {
  const name = user?.name || user?.fullName || user?.email || 'Mentor';
  const initials = name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'M';
  const activeSection = sections.find(([key]) => key === section) || sections[0];

  return `<div id="${section === 'dashboard' ? 'mentor-dashboard' : 'mentor-workspace'}" class="admin-shell">
    <a class="admin-skip btn btn-primary" href="#mentor-content">Skip to content</a>
    <aside class="admin-sidebar">
      <div class="admin-sidebar-header">
        <a href="#/" class="admin-logo" aria-label="HappyProgramming home"><span class="admin-logo-mark">{h}</span><span>Happy<span class="text-brand">Programming</span></span></a>
        <button id="mentor-menu" class="admin-mobile-menu btn btn-outline btn-sm" type="button" aria-expanded="false" aria-controls="mentor-navigation">Menu</button>
      </div>
      <div>
        <p class="eyebrow mb-4">MENTOR WORKSPACE</p>
        <nav id="mentor-navigation" aria-label="Mentor workspace">
          ${sections.map(([key, label, href, icon]) => `<a class="admin-nav-link" href="${href}" ${key === activeSection[0] ? 'aria-current="page"' : ''}>${adminIcon(icon)}<span>${label}</span></a>`).join('')}
        </nav>
      </div>
      <div class="admin-sidebar-bottom">
        <div class="admin-sidebar-note"><strong class="text-ink">Your mentorship space</strong><p class="mt-2">Review requests, manage your profile, and keep track of your mentoring activity.</p></div>
        <a href="#/" class="admin-nav-link">${adminIcon('arrow')}Back to website</a>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar">
        <p><span class="text-muted">Workspace</span><span class="mx-2 text-muted">/</span>${e(activeSection[1])}</p>
        <div class="flex items-center gap-4">
          <div class="admin-profile"><span class="admin-avatar">${e(initials)}</span><div><p class="font-semibold">${e(name)}</p><p class="text-muted text-[10px] mt-0.5">Mentor</p></div></div>
          <button id="mentor-logout-btn" class="btn btn-outline btn-sm" type="button">Sign out</button>
        </div>
      </header>
      <main id="mentor-content" class="admin-content" tabindex="-1"><p id="mentor-layout-error" class="admin-notice notice-error mb-5" role="alert" hidden></p>${content}</main>
    </div>
  </div>`;
}

export function bindMentorLayout(root) {
  const shell = root.matches?.('.admin-shell') ? root : root.querySelector('.admin-shell');
  if (!shell) return () => {};
  const menu = shell.querySelector('#mentor-menu');
  const skip = shell.querySelector('.admin-skip');
  const logout = shell.querySelector('#mentor-logout-btn');
  const error = shell.querySelector('#mentor-layout-error');

  const onMenu = () => {
    const open = shell.querySelector('.admin-sidebar').classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
  };
  const onSkip = event => {
    event.preventDefault();
    shell.querySelector('#mentor-content')?.focus();
  };
  const onLogout = async () => {
    logout.disabled = true;
    error.hidden = true;
    try {
      await authService.logout();
      window.location.hash = '#/login';
    } catch {
      if (shell.isConnected) {
        error.textContent = 'Unable to sign out. Please try again.';
        error.hidden = false;
        logout.disabled = false;
      }
    }
  };

  menu?.addEventListener('click', onMenu);
  skip?.addEventListener('click', onSkip);
  logout?.addEventListener('click', onLogout);
  return () => {
    menu?.removeEventListener('click', onMenu);
    skip?.removeEventListener('click', onSkip);
    logout?.removeEventListener('click', onLogout);
  };
}
