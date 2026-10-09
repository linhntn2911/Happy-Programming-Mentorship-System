/**
 * Staff Manager Mentors Page - HappyProgramming
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { StaffLayout } from './StaffLayout.js';
import { StatusBadge, DataTable } from '../admin/AdminPrimitives.js';
import { escapeHtml as e } from '../../shared/html.js';

export function StaffMentorsPage(mentors = [], user = null) {
  const staffName = user?.name || user?.email || 'Staff';

  const mentorRows = mentors.map(m => {
    const initials = (m.name || 'M').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const personHtml = `
      <div class="admin-person">
        <span class="admin-avatar">${e(initials)}</span>
        <div>
          <strong>${e(m.name)}</strong>
          <small>${e(m.jobTitle || 'Mentor')}</small>
        </div>
      </div>
    `;

    const skillsHtml = `
      <div class="flex flex-wrap gap-1">
        ${(m.skills || []).map(s => `<span class="badge !text-[10px] !py-0.5">${e(s)}</span>`).join('')}
      </div>
    `;

    return [
      personHtml,
      e(m.email),
      skillsHtml,
      `${e(m.experienceYears || '0')} yrs`,
      StatusBadge(m.status || 'ACTIVE'),
      `<button class="btn btn-outline btn-sm" data-view-mentor="${m.id}">
        View profile
      </button>`
    ];
  });

  const emptyHtml = `
    <div class="p-12 text-center text-muted text-xs">
      No mentors found matching the criteria.
    </div>
  `;

  const content = `
    <!-- Page Heading -->
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">HAPPYPROGRAMMING STAFF</p>
        <h1>Manager mentors</h1>
        <p>Inspect verified mentors, technical specialization tracks, and profile status.</p>
      </div>
      <div>
        <span class="status-badge status-neutral text-xs font-semibold py-1.5 px-3">
          ${mentors.length} Verified mentors
        </span>
      </div>
    </div>

    <!-- Main Content Panel with Filter Toolbar -->
    <section class="admin-panel">
      <!-- Search & Filters Toolbar -->
      <div class="admin-toolbar">
        <label class="admin-field admin-search" for="mentor-search-input">
          Search mentors
          <input type="search" id="mentor-search-input" placeholder="Search by name or email" maxlength="100">
        </label>
        <label class="admin-field" for="mentor-skill-filter">
          Skill track
          <select id="mentor-skill-filter">
            <option value="ALL">All skills</option>
            <option value="Java">Java</option>
            <option value="React">React</option>
            <option value="Python">Python</option>
            <option value="DevOps">DevOps</option>
          </select>
        </label>
        <label class="admin-field" for="mentor-status-filter">
          Status
          <select id="mentor-status-filter">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE" selected>Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      <!-- Mentors Data Table -->
      <div id="mentor-table-container">
        ${DataTable({
          caption: 'Active mentor directory',
          headings: ['Mentor', 'Email address', 'Skills', 'Experience', 'Status', 'Action'],
          rows: mentorRows,
          empty: emptyHtml
        })}
      </div>
    </section>

    <!-- Mentor Profile Detail Modal Dialog -->
    <dialog id="mentor-detail-dialog" class="modal" aria-labelledby="mentor-detail-modal-title">
      <div id="mentor-detail-dialog-content">
        <!-- Dynamically injected via JS -->
      </div>
    </dialog>
  `;

  return StaffLayout('mentors', content, {
    name: staffName
  });
}
