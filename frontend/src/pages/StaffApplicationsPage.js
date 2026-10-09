/**
 * Staff Mentor Applications Review Page - HappyProgramming
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { StaffLayout } from '../components/layout/StaffLayout.js';
import { StatusBadge, DataTable } from '../components/ui/AdminPrimitives.js';
import { escapeHtml as e } from '../utils/html.js';

export function StaffApplicationsPage(applications = [], activeTab = 'PENDING', user = null) {
  const staffName = user?.name || user?.email || 'Staff';

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const approvedCount = applications.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;

  const filteredApps = applications.filter(app => {
    if (activeTab === 'ALL') return true;
    return app.status === activeTab;
  });

  const appRows = filteredApps.map(app => {
    const initials = (app.applicantName || app.name || 'A').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const personHtml = `
      <div class="admin-person">
        <span class="admin-avatar">${e(initials)}</span>
        <div>
          <strong>${e(app.applicantName || app.name)}</strong>
          <small>${e(app.email)}</small>
        </div>
      </div>
    `;

    return [
      personHtml,
      e(app.specialty || 'General Software Engineering'),
      `${e(app.experienceYears || '0')} yrs`,
      e(app.submittedDate || 'Recent'),
      StatusBadge(app.status),
      `<button class="btn btn-outline btn-sm" data-review-app="${app.id}">
        ${app.status === 'PENDING' ? 'Review CV' : 'View Details'}
      </button>`
    ];
  });

  const emptyHtml = `
    <div class="p-12 text-center text-muted text-xs">
      No mentor applications matching filter "${e(activeTab)}".
    </div>
  `;

  const content = `
    <!-- Page Heading -->
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">HAPPYPROGRAMMING STAFF</p>
        <h1>Mentor applications</h1>
        <p>Review applicant qualifications, verify PDF CV documents, and issue approval decisions.</p>
      </div>
      <div>
        <span class="status-badge status-warning text-xs font-semibold py-1.5 px-3">
          ${pendingCount} Pending review (48h SLA)
        </span>
      </div>
    </div>

    <!-- Main Content Panel with Filter Toolbar -->
    <section class="admin-panel">
      <!-- Status Tabs Toolbar -->
      <div class="admin-toolbar justify-between">
        <div class="flex flex-wrap gap-2">
          <button data-app-tab="PENDING" class="btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-outline'} btn-sm">
            Pending (${pendingCount})
          </button>
          <button data-app-tab="APPROVED" class="btn ${activeTab === 'APPROVED' ? 'btn-primary' : 'btn-outline'} btn-sm">
            Approved (${approvedCount})
          </button>
          <button data-app-tab="REJECTED" class="btn ${activeTab === 'REJECTED' ? 'btn-primary' : 'btn-outline'} btn-sm">
            Rejected (${rejectedCount})
          </button>
          <button data-app-tab="ALL" class="btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-outline'} btn-sm">
            All (${applications.length})
          </button>
        </div>
        <div class="text-[11px] text-muted self-center">
          Showing ${filteredApps.length} of ${applications.length} applications
        </div>
      </div>

      <!-- Data Table -->
      ${DataTable({
        caption: 'Mentor applications queue',
        headings: ['Applicant', 'Specialty track', 'Experience', 'Submitted date', 'Status', 'Action'],
        rows: appRows,
        empty: emptyHtml
      })}
    </section>

    <!-- Review Modal Dialog -->
    <dialog id="app-review-dialog" class="modal" aria-labelledby="app-review-modal-title">
      <div id="app-review-dialog-content">
        <!-- Dynamically injected via JS -->
      </div>
    </dialog>
  `;

  return StaffLayout('applications', content, {
    name: staffName
  });
}
