import { escapeHtml as e } from '../../shared/html.js';

const paths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/>',
  staff: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  revenue: '<path d="M4 3v18h17M8 16l4-5 4 2 5-7"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  audit: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 12h6M9 17h4"/>',
  arrow: '<path d="M19 12H5m5-5-5 5 5 5"/>',
};
export const adminSections = { overview: 'Overview', users: 'User management', staff: 'Staff & permissions', revenue: 'Revenue reports', settings: 'System settings', audit: 'Audit logs' };
export function adminIcon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.overview}</svg>`; }

export function AdminLayout(section, content, { name = 'Administrator', demo = false } = {}) {
  const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join('');
  return `<div class="admin-shell">
    <a class="admin-skip btn btn-primary" href="#admin-content">Skip to content</a>
    <aside class="admin-sidebar">
      <div class="admin-sidebar-header"><a href="#/" class="admin-logo" aria-label="HappyProgramming home"><span class="admin-logo-mark">{h}</span><span>Happy<span class="text-brand">Programming</span></span></a><button class="admin-mobile-menu btn btn-outline btn-sm" id="admin-menu" aria-expanded="false" aria-controls="admin-navigation">Menu</button></div>
      <div><p class="eyebrow mb-4">ADMIN WORKSPACE</p><nav id="admin-navigation" aria-label="Administration">${Object.entries(adminSections).map(([key, label]) => `<a class="admin-nav-link" href="#/admin${key === 'overview' ? '' : '/' + key}" ${key === section ? 'aria-current="page"' : ''}>${adminIcon(key)}${label}</a>`).join('')}</nav></div>
      <div class="admin-sidebar-bottom"><div class="admin-sidebar-note"><strong class="text-ink">A little care. A lot of growth.</strong><p class="mt-2">Keep the community a great place to learn, connect, and grow.</p></div><a href="#/" class="admin-nav-link">${adminIcon('arrow')}Back to website</a></div>
    </aside>
    <div class="admin-main"><header class="admin-topbar"><p><span class="text-muted">Workspace</span> <span class="mx-2 text-muted">/</span> ${e(adminSections[section] || 'Overview')}</p><div class="admin-profile"><span class="admin-avatar">${e(initials)}</span><div><p class="font-semibold">${e(name)}</p><p class="text-muted text-[10px] mt-1">${demo ? 'Demo administrator' : 'Administrator'}</p></div></div></header>
      <main id="admin-content" class="admin-content" tabindex="-1">${content}</main>
    </div>
  </div>`;
}
