import { StaffLayout } from './StaffLayout.js';
import { EmptyState } from '../../shared/EmptyState.js';
import { StatCard, DataTable, Notice } from '../admin/AdminPrimitives.js';
import { escapeHtml as e } from '../../shared/html.js';
import { money, dateTime } from '../admin/admin.js';

export function StaffPayoutsPage(requests = [], user = null, notice = null) {
  const pendingCount = requests.length;
  const totalAmount = requests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const rows = requests.map(item => [
    `${e(item.mentorName)}<small class="block text-muted mt-1">${e(item.mentorEmail)} · ID ${e(item.mentorId)}</small>`,
    `<div class="flex items-center gap-1.5">
      <span class="font-semibold text-ink">${money(item.amount)}</span>
      <button type="button" class="btn btn-ghost btn-xs copy-btn text-brand" data-copy="${e(item.amount)}" title="Copy amount" aria-label="Copy amount for ${e(item.mentorName)}">
        <svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>`,
    `<div>
      <span class="font-medium text-ink">${e(item.bankName)}</span> · <span class="text-ink">${e(item.accountName)}</span>
      <div class="flex items-center gap-2 mt-1">
        <span class="font-mono text-muted text-xs bg-lilac/50 px-1.5 py-0.5 rounded">${e(item.accountNumber)}</span>
        <button type="button" class="btn btn-outline btn-xs copy-btn" data-copy="${e(item.accountNumber)}" title="Copy account number" aria-label="Copy account number for ${e(item.mentorName)}">
          Copy STK
        </button>
      </div>
    </div>`,
    e(dateTime(item.requestedAt)),
    `<div class="flex flex-wrap gap-2">
      <button class="btn btn-primary btn-sm" data-payout-approve="${e(item.id)}" aria-label="Approve withdrawal for ${e(item.mentorName)}">Approve</button>
      <button class="btn btn-outline btn-sm" data-payout-reject="${e(item.id)}" aria-label="Reject withdrawal for ${e(item.mentorName)}">Reject</button>
    </div>`
  ]);

  const empty = EmptyState({
    id: 'staff-empty-payouts',
    title: 'No pending payouts',
    description: 'New mentor withdrawal requests will appear here once submitted.',
    buttonText: '',
    hidden: false
  });

  const content = `
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">STAFF WORKSPACE</p>
        <h1>Mentor payouts</h1>
        <p>Review mentor withdrawal requests. Verify banking information, then approve to send to Admin for payment or reject with a reason.</p>
      </div>
    </div>

    ${notice ? `<div class="mb-6">${Notice(notice)}</div>` : ''}

    <div class="admin-stats">
      ${StatCard({
        label: 'Pending requests',
        value: pendingCount,
        note: 'Awaiting operational review',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>'
      })}
      ${StatCard({
        label: 'Total withdrawal amount',
        value: money(totalAmount),
        note: 'Net amount to transfer · VND',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>'
      })}
      ${StatCard({
        label: 'Operational SLA',
        value: '48h',
        note: 'Process verified transfers timely',
        icon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      })}
    </div>

    <section class="admin-panel">
      <div class="admin-panel-heading">
        <div>
          <h2>Pending requests</h2>
          <p>${pendingCount} ${pendingCount === 1 ? 'request' : 'requests'} awaiting review</p>
        </div>
      </div>
      <div class="admin-toolbar">
        <label class="admin-field admin-search grow" for="staff-payout-query">
          Search requests
          <input id="staff-payout-query" name="query" type="search" placeholder="Search by mentor name, email, or bank..." maxlength="100">
        </label>
      </div>
      <div id="staff-payouts-table-container">
        ${DataTable({
          caption: 'Pending mentor payout requests',
          headings: ['Mentor', 'Amount', 'Bank destination', 'Requested (UTC)', 'Actions'],
          rows,
          empty
        })}
      </div>
    </section>
  `;

  return StaffLayout('payouts', content, user || {});
}
