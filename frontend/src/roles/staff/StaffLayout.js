import { escapeHtml as e } from '../../shared/html.js';

const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  applications: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  mentors: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/>',
  mentees: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  reports: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  payouts: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  messages: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  skills: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  categories: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  arrow: '<path d="M19 12H5m5-5-5 5 5 5"/>',
};

export const staffSections = {
  dashboard: 'Staff Dashboard',
  applications: 'Mentor applications',
  mentors: 'Manage Mentors',
  mentees: 'Manage Mentees',
  requests: 'Mentorship requests',
  skills: 'Technical skills',
  categories: 'Skill categories',
  reports: 'Manage Reports',
  payouts: 'Mentor payouts',
  messages: 'Mentorship messages'
};

export function staffIcon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.dashboard}</svg>`;
}

export function StaffLayout(section, content, { name = 'Operational Staff' } = {}) {
  const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'ST';
  const isSkillGroup = section === 'skills' || section === 'categories';
  const getHref = (key) => {
    switch (key) {
      case 'dashboard': return '#/staff/dashboard';
      case 'applications': return '#/staff/mentor-applications';
      case 'mentors': return '#/staff/mentors';
      case 'mentees': return '#/staff/mentees';
      case 'requests': return '#/staff/requests';
      case 'skills': return '#/staff/skills';
      case 'categories': return '#/staff/categories';
      case 'reports': case 'disputes': return '#/staff/reports';
      case 'payouts': return '#/staff/payouts';
      case 'messages': return '#/workspace';
      default: return '#/staff/dashboard';
    }
  };

  const navKeys = ['dashboard', 'applications', 'mentors', 'mentees', 'requests', 'skills', 'reports', 'payouts', 'messages'];

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
            ${navKeys.map(key => {
              if (key === 'skills') {
                return `
                  <div class="admin-nav-group">
                    <button type="button" class="admin-nav-link w-full flex items-center justify-between text-left ${isSkillGroup ? '!text-brand font-semibold' : ''}" id="staff-nav-skills-toggle" aria-expanded="${isSkillGroup ? 'true' : 'false'}">
                      <span class="flex items-center gap-2">
                        ${staffIcon('skills')}
                        <span>Skills & Categories</span>
                      </span>
                      <svg id="staff-skills-chevron" class="w-3.5 h-3.5 transition-transform duration-200 ${isSkillGroup ? 'rotate-180 text-brand' : 'text-muted'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div id="staff-skills-submenu" class="pl-8 pr-2 py-1 space-y-1 ${isSkillGroup ? '' : 'hidden'}">
                      <a class="admin-nav-link !py-1.5 !px-2.5 !text-xs !min-h-0 ${section === 'skills' ? '!bg-lilac !text-brand font-semibold' : '!text-muted hover:!text-ink'}" href="#/staff/skills" ${section === 'skills' ? 'aria-current="page"' : ''}>
                        <span>• Technical skills</span>
                      </a>
                      <a class="admin-nav-link !py-1.5 !px-2.5 !text-xs !min-h-0 ${section === 'categories' ? '!bg-lilac !text-brand font-semibold' : '!text-muted hover:!text-ink'}" href="#/staff/categories" ${section === 'categories' ? 'aria-current="page"' : ''}>
                        <span>• Skill categories</span>
                      </a>
                    </div>
                  </div>
                `;
              }
              return `
                <a class="admin-nav-link" href="${getHref(key)}" ${key === section ? 'aria-current="page"' : ''}>
                  ${staffIcon(key)}
                  <span>${staffSections[key]}</span>
                </a>
              `;
            }).join('')}
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
