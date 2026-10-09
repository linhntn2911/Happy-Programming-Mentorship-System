import { escapeHtml as e } from '../../shared/html.js';

const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  applications: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  mentors: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/>',
  mentees: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  arrow: '<path d="M19 12H5m5-5-5 5 5 5"/>',
};

export const staffSections = {
  dashboard: 'Staff Dashboard',
  applications: 'Mentor applications',
  mentors: 'Manager Mentors',
  mentees: 'Manager Mentees'
};

export function staffIcon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.dashboard}</svg>`;
}

export function StaffLayout(section, content, { name = 'Operational Staff' } = {}) {
  const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'ST';
  const getHref = (key) => {
    switch (key) {
      case 'dashboard': return '#/staff/dashboard';
      case 'applications': return '#/staff/mentor-applications';
      case 'mentors': return '#/staff/mentors';
      case 'mentees': return '#/staff/mentees';
      default: return '#/staff/dashboard';
    }
  };

  return `
    <div class="admin-shell">
      <a class="admin-skip btn btn-primary" href="#staff-content">Skip to content</a>

      <!-- 246px Fixed Navigation Rail -->
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <a href="#/" class="admin-logo" aria-label="HappyProgramming home">
            <span class="admin-logo-mark">{h}</span>
            <span>Happy<span class="text-brand">Programming</span></span>
          </a>
          <button class="admin-mobile-menu btn btn-outline btn-sm" id="staff-menu" aria-expanded="false" aria-controls="staff-navigation">
            Menu
          </button>
        </div>

        <div>
          <p class="eyebrow mb-4">STAFF WORKSPACE</p>
          <nav id="staff-navigation" aria-label="Staff Operations">
            ${Object.entries(staffSections).map(([key, label]) => `
              <a class="admin-nav-link" href="${getHref(key)}" ${key === section ? 'aria-current="page"' : ''}>
                ${staffIcon(key)}
                <span>${label}</span>
              </a>
            `).join('')}
          </nav>
        </div>

        <div class="admin-sidebar-bottom">
          <div class="admin-sidebar-note">
            <strong class="text-ink">Operational SLA</strong>
            <p class="mt-2">Review applicant CVs within the 48-hour SLA to uphold community trust and mentor quality.</p>
          </div>
          <a href="#/" class="admin-nav-link">
            ${staffIcon('arrow')}Back to website
          </a>
        </div>
      </aside>

      <!-- Main Workspace -->
      <div class="admin-main">
        <header class="admin-topbar">
          <p>
            <span class="text-muted">Workspace</span>
            <span class="mx-2 text-muted">/</span>
            ${e(staffSections[section] || 'Overview')}
          </p>

          <div class="flex items-center gap-4">
            <div class="admin-profile">
              <span class="admin-avatar">${e(initials)}</span>
              <div>
                <p class="font-semibold">${e(name)}</p>
                <p class="text-muted text-[10px] mt-0.5">Operational Staff</p>
              </div>
            </div>
            <button id="staff-logout-btn" class="btn btn-outline btn-sm" type="button">
              Sign out
            </button>
          </div>
        </header>

        <main id="staff-content" class="admin-content" tabindex="-1">
          ${content}
        </main>
      </div>
    </div>
  `;
}
