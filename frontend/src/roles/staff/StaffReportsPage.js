import { StaffLayout, staffIcon } from './StaffLayout.js';
import { EmptyState } from '../../shared/EmptyState.js';
import { StatCard, DataTable, Notice, StatusBadge } from '../admin/AdminPrimitives.js';
import { escapeHtml as e } from '../../shared/html.js';
import { money, dateTime } from '../admin/admin.js';

function disputeStatusBadge(status) {
  const tone = {
    SUBMITTED: 'neutral',
    IN_MEDIATION: 'warning',
    AWAITING_EVIDENCE: 'warning',
    APPROVED: 'success',
    RESOLVED: 'success',
    REJECTED: 'danger'
  }[status] || 'neutral';
  return `<span class="status-badge status-${tone}"><span aria-hidden="true">●</span> ${e(String(status).toLowerCase().replaceAll('_', ' '))}</span>`;
}

export function StaffReportsPage(reports = [], filters = {}, user = null, notice = null) {
  const activeStatus = filters.status || 'ALL';
  const activeCategory = filters.category || 'ALL';
  const query = (filters.query || '').trim().toLowerCase();

  const filteredReports = reports.filter(r => {
    if (activeStatus !== 'ALL' && r.status !== activeStatus) return false;
    if (activeCategory !== 'ALL' && r.category !== activeCategory) return false;
    if (query) {
      const match = [
        r.ticketCode,
        r.title,
        r.complainantName,
        r.complainantEmail,
        r.respondentName,
        r.respondentEmail,
        r.category
      ].some(val => (val || '').toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });

  const needsTriageCount = reports.filter(r => r.status === 'SUBMITTED').length;
  const inMediationCount = reports.filter(r => r.status === 'IN_MEDIATION').length;
  const awaitingCount = reports.filter(r => r.status === 'AWAITING_EVIDENCE').length;
  const resolvedCount = reports.filter(r => r.status === 'RESOLVED' || r.status === 'REJECTED').length;

  const rows = filteredReports.map(item => [
    `<span class="font-mono font-semibold text-xs text-brand">${e(item.ticketCode)}</span>`,
    `<div>
      <span class="font-semibold text-ink">${e(item.title || 'Mentorship')}</span>
      <span class="badge !text-[10px] !py-0.5 ml-1">${e(item.targetType)}</span>
    </div>`,
    `<div>
      <span class="font-medium text-ink">${e(item.complainantName)}</span>
      <small class="block text-muted text-[11px]">${e(item.complainantEmail)}</small>
    </div>`,
    `<div>
      <span class="font-medium text-ink">${e(item.respondentName)}</span>
      <small class="block text-muted text-[11px]">${e(item.respondentEmail)}</small>
    </div>`,
    `<span class="text-xs text-muted font-medium">${e(item.category ? item.category.replaceAll('_', ' ') : 'GENERAL')}</span>`,
    `<span class="font-semibold text-ink">${money(item.disputedAmount)}</span>`,
    `<span class="text-xs text-muted">${e(dateTime(item.createdAt))}</span>`,
    disputeStatusBadge(item.status),
    `<button class="btn btn-primary btn-sm" data-review-report="${e(item.id)}" aria-label="Review dispute ${e(item.ticketCode)}">Review Ticket</button>`
  ]);

  const empty = EmptyState({
    id: 'staff-empty-reports',
    title: 'No reports or disputes found',
    description: 'No complaints match the selected filter criteria. When mentees file dispute claims, they will appear here.',
    buttonText: '',
    hidden: false
  });

  const content = `
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">STAFF WORKSPACE</p>
        <h1>Manage Reports & Disputes</h1>
        <p>Triage mentee complaints, inspect submitted photo evidence, open mediation, and execute financial settlements.</p>
      </div>
    </div>

    ${notice ? `<div class="mb-6">${Notice(notice)}</div>` : ''}

    <div class="admin-stats">
      ${StatCard({
        label: 'Needs triage',
        value: needsTriageCount,
        note: 'Submitted complaints awaiting intake',
        icon: staffIcon('reports')
      })}
      ${StatCard({
        label: 'In mediation',
        value: inMediationCount,
        note: 'Active 3-party dispute rooms',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      })}
      ${StatCard({
        label: 'Awaiting evidence',
        value: awaitingCount,
        note: 'Timer running for respondent statement',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      })}
      ${StatCard({
        label: 'Resolved & closed',
        value: resolvedCount,
        note: 'Settled disputes with finalized ledger',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      })}
    </div>

    <section class="admin-panel">
      <div class="admin-panel-heading">
        <div>
          <h2>Dispute queue</h2>
          <p>${filteredReports.length} ${filteredReports.length === 1 ? 'ticket' : 'tickets'} matching current filters</p>
        </div>
      </div>

      <div class="admin-toolbar flex flex-wrap gap-4 items-end">
        <label class="admin-field admin-search grow" for="staff-report-query">
          Search reports
          <input id="staff-report-query" name="query" type="search" value="${e(filters.query || '')}" placeholder="Search ticket code, mentee, mentor, or topic..." maxlength="100">
        </label>
        
        <label class="admin-field" for="staff-report-status">
          Status
          <select id="staff-report-status" name="status">
            <option value="ALL" ${activeStatus === 'ALL' ? 'selected' : ''}>All statuses</option>
            <option value="SUBMITTED" ${activeStatus === 'SUBMITTED' ? 'selected' : ''}>Submitted (Needs Triage)</option>
            <option value="IN_MEDIATION" ${activeStatus === 'IN_MEDIATION' ? 'selected' : ''}>In Mediation</option>
            <option value="AWAITING_EVIDENCE" ${activeStatus === 'AWAITING_EVIDENCE' ? 'selected' : ''}>Awaiting Evidence</option>
            <option value="APPROVED" ${activeStatus === 'APPROVED' ? 'selected' : ''}>Approved (Awaiting Admin Transfer)</option>
            <option value="RESOLVED" ${activeStatus === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
            <option value="REJECTED" ${activeStatus === 'REJECTED' ? 'selected' : ''}>Rejected</option>
          </select>
        </label>

        <label class="admin-field" for="staff-report-category">
          Category
          <select id="staff-report-category" name="category">
            <option value="ALL" ${activeCategory === 'ALL' ? 'selected' : ''}>All categories</option>
            <option value="NO_SHOW" ${activeCategory === 'NO_SHOW' ? 'selected' : ''}>Mentor No-Show</option>
            <option value="QUALITY_MISMATCH" ${activeCategory === 'QUALITY_MISMATCH' ? 'selected' : ''}>Quality Mismatch</option>
            <option value="UNRESPONSIVE" ${activeCategory === 'UNRESPONSIVE' ? 'selected' : ''}>Unresponsive Mentor</option>
            <option value="CONDUCT_VIOLATION" ${activeCategory === 'CONDUCT_VIOLATION' ? 'selected' : ''}>Conduct Violation</option>
            <option value="TECHNICAL_FAILURE" ${activeCategory === 'TECHNICAL_FAILURE' ? 'selected' : ''}>Technical Failure</option>
            <option value="OTHER" ${activeCategory === 'OTHER' ? 'selected' : ''}>Other Circumstances</option>
          </select>
        </label>

        <button id="staff-report-reset" class="btn btn-outline btn-sm mb-1" type="button">Reset</button>
      </div>

      <div id="staff-reports-table-container">
        ${DataTable({
          caption: 'Staff Dispute Queue',
          headings: ['Ticket code', 'Service', 'Complainant', 'Respondent', 'Category', 'Disputed amount', 'Filed date', 'Status', 'Actions'],
          rows,
          empty
        })}
      </div>
    </section>

    <!-- Modal for Review & Resolution -->
    <dialog class="modal" id="report-detail-dialog" aria-labelledby="report-dialog-title">
      <div class="modal-card !max-w-2xl" id="report-detail-dialog-content"></div>
    </dialog>
  `;

  return StaffLayout('reports', content, user || {});
}
