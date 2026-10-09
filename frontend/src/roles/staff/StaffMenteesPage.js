/**
 * Staff Manager Mentees Page - HappyProgramming
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { StaffLayout } from './StaffLayout.js';
import { StatusBadge, DataTable } from '../admin/AdminPrimitives.js';
import { escapeHtml as e } from '../../shared/html.js';

export function StaffMenteesPage(mentees = [], user = null) {
  const staffName = user?.name || user?.email || 'Staff';

  const menteeRows = mentees.map(m => {
    const initials = (m.name || 'U').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const personHtml = `
      <div class="admin-person">
        <span class="admin-avatar">${e(initials)}</span>
        <div>
          <strong>${e(m.name)}</strong>
          <small>${m.emailVerified ? 'Email verified' : 'Unverified email'}</small>
        </div>
      </div>
    `;

    return [
      personHtml,
      e(m.email),
      e(m.registeredDate || 'Recent'),
      `<span class="badge !text-[10px] !py-0.5">${e(m.requestsCount || 0)} requests</span>`,
      StatusBadge(m.status || 'ACTIVE'),
      `<button class="btn btn-outline btn-sm" data-view-mentee="${m.id}">
        View details
      </button>`
    ];
  });

  const emptyHtml = `
    <div class="p-12 text-center text-muted text-xs">
      No mentees found matching the criteria.
    </div>
  `;

  const content = `
    <!-- Page Heading -->
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">HAPPYPROGRAMMING STAFF</p>
        <h1>Manager mentees</h1>
        <p>View registered mentee accounts, connection requests, and user verification status.</p>
      </div>
      <div>
        <span class="status-badge status-neutral text-xs font-semibold py-1.5 px-3">
          ${mentees.length} Registered mentees
        </span>
      </div>
    </div>

    <!-- Main Content Panel with Filter Toolbar -->
    <section class="admin-panel">
      <!-- Search & Filters Toolbar -->
      <div class="admin-toolbar">
        <label class="admin-field admin-search" for="mentee-search-input">
          Search mentees
          <input type="search" id="mentee-search-input" placeholder="Search by name or email" maxlength="100">
        </label>
        <label class="admin-field" for="mentee-status-filter">
          Status
          <select id="mentee-status-filter">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE" selected>Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>
        </label>
      </div>

      <!-- Mentees Data Table -->
      <div id="mentee-table-container">
        ${DataTable({
          caption: 'Registered mentee directory',
          headings: ['Mentee', 'Email address', 'Registered on', 'Requests', 'Status', 'Action'],
          rows: menteeRows,
          empty: emptyHtml
        })}
      </div>
    </section>

    <!-- Mentee Detail Modal Dialog -->
    <dialog id="mentee-detail-dialog" class="modal" aria-labelledby="mentee-detail-modal-title">
      <div id="mentee-detail-dialog-content">
        <!-- Dynamically injected via JS -->
      </div>
    </dialog>
  `;

  return StaffLayout('mentees', content, {
    name: staffName
  });
}
