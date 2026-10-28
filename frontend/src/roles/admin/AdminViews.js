import { Button } from '../../shared/Button.js';
import { Badge } from '../../shared/Badge.js';
import { EmptyState } from '../../shared/EmptyState.js';
import { StatCard, StatusBadge, DataTable } from './AdminPrimitives.js';
import { adminIcon } from './AdminLayout.js';
import { escapeHtml as e } from '../../shared/html.js';
import { filterUsers, paymentCommission, money, dateTime, pageItems, revenue } from './admin.js';
import { getPageNumbers } from '../../shared/pagination.js';

export const heading = (title, description, action = '') => `<div class="admin-page-heading"><div><p class="eyebrow mb-3">HAPPYPROGRAMMING ADMIN</p><h1>${e(title)}</h1><p>${e(description)}</p></div>${action}</div>`;
const panel = (title, description, content, action = '') => `<section class="admin-panel"><div class="admin-panel-heading"><div><h2>${e(title)}</h2>${description ? `<p>${e(description)}</p>` : ''}</div>${action}</div>${content}</section>`;
const empty = (title = 'No results found', description = 'Try another search or clear the filters.') => EmptyState({ id: 'admin-empty', title, description, buttonText: '', hidden: false });
const person = user => `<div class="admin-person"><span class="admin-avatar">${e(user.name.split(/\s+/).map(p => p[0]).slice(0, 2).join(''))}</span><div><strong>${e(user.name)}</strong><small>${e(user.email)}</small></div></div>`;
const select = (id, label, values, current = '', all = 'All') => `<label class="admin-field" for="${id}">${e(label)}<select id="${id}" name="${id}">${all ? `<option value="">${e(all)}</option>` : ''}${values.map(v => `<option value="${e(v)}" ${v === current ? 'selected' : ''}>${e(v.charAt(0) + v.slice(1).toLowerCase())}</option>`).join('')}</select></label>`;
function pagination(result) {
  if (!result || !result.pages || result.pages <= 1) {
    return `<div class="admin-pagination"><p>${result?.total ? (result.page - 1) * 8 + 1 : 0}–${Math.min(result?.page * 8 || 0, result?.total || 0)} of ${result?.total || 0} results</p></div>`;
  }
  const totalPages = result.pages;
  const currentPage = result.page;

  const pageNumbers = getPageNumbers(currentPage - 1, totalPages);
  const pageItemsList = pageNumbers.map(item => {
    if (item === 'ellipsis') return '<span class="grid h-8 w-8 place-items-center text-xs text-muted" aria-hidden="true">…</span>';
    const isActive = item === currentPage - 1;
    return `<button type="button" data-admin-page-jump="${item + 1}" aria-current="${isActive ? 'page' : 'false'}" class="btn btn-sm min-w-8 h-8 px-2 text-xs font-semibold ${isActive ? 'btn-primary' : 'btn-outline'}">${item + 1}</button>`;
  }).join('');

  const selectOptions = Array.from({ length: totalPages }, (_, i) =>
    `<option value="${i + 1}" ${i + 1 === currentPage ? 'selected' : ''}>Page ${i + 1}</option>`
  ).join('');

  return `<div class="admin-pagination flex-wrap gap-4">
    <p>${result.total ? (result.page - 1) * 8 + 1 : 0}–${Math.min(result.page * 8, result.total)} of ${result.total} results</p>
    <div class="flex flex-wrap items-center gap-2">
      ${Button({ id: 'admin-prev', label: 'Previous', variant: 'outline', size: 'sm', disabled: result.page === 1 })}
      <div class="flex items-center gap-1.5" role="group" aria-label="Page numbers">${pageItemsList}</div>
      ${Button({ id: 'admin-next', label: 'Next', variant: 'outline', size: 'sm', disabled: result.page === result.pages })}
      <div class="flex items-center gap-2 ml-2 text-xs text-muted">
        <label for="admin-page-select" class="font-medium text-ink">Go to:</label>
        <select id="admin-page-select" class="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:border-brand focus:outline-none">${selectOptions}</select>
        <span>of ${totalPages} pages</span>
      </div>
    </div>
  </div>`;
}
function stats(data, report) {
  return `<div class="admin-stats">${StatCard({ label: 'Community accounts', value: data.users.length, note: `${data.users.filter(u => u.status === 'ACTIVE').length} active accounts`, icon: adminIcon('users') })}${StatCard({ label: 'Active mentors', value: data.users.filter(u => u.role === 'MENTOR' && u.status === 'ACTIVE').length, note: 'Accounts with active status', icon: adminIcon('staff') })}${StatCard({ label: 'Gross payments', value: money(report.gross), note: 'Verified payments · all time', icon: adminIcon('revenue') })}${StatCard({ label: 'Estimated gross commission', value: money(report.commission), note: 'Historical commission rates · all time', icon: adminIcon('settings') })}</div>`;
}
function chart(payments) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return { label: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), total: payments.filter(p => p.paidAt.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0) };
  });
  const maximum = Math.max(...months.map(m => m.total), 1);
  return `<div class="admin-chart" role="img" aria-label="${e(months.map(m => `${m.label}: ${money(m.total)}`).join('; '))}">${months.map(m => `<div class="admin-chart-column"><div class="admin-chart-bar" style="height:${Math.round(m.total / maximum * 150)}px" title="${e(money(m.total))}"></div><span>${e(m.label)}</span></div>`).join('')}</div>`;
}
export function OverviewView(data, session) {
  const report = revenue(data.payments);
  return heading(`Welcome back, ${session.name.split(' ')[0]}.`, 'A little oversight, a thriving community. Here is your platform at a glance.', `<a class="btn btn-primary" href="#/admin/revenue">View revenue report ${adminIcon('revenue')}</a>`) + stats(data, report) +
    `<div class="admin-grid">${panel('Revenue overview', 'Verified gross payments · last 6 calendar months · VND', `<div class="admin-panel-body"><p class="text-[28px] font-semibold">${money(report.payments.filter(p => p.paidAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, p) => s + Number(p.amount), 0))}</p><p class="text-[11px] text-muted mt-1">This month · UTC</p>${chart(report.payments)}</div>`)}${panel('Recent activity', 'A clear record of every administrative change', `<div class="admin-panel-body admin-activity">${data.audit.slice(0, 4).map(a => `<div class="admin-activity-item"><span class="admin-avatar">${adminIcon('audit')}</span><div><p class="font-semibold">${e(a.action.replaceAll('_', ' ').toLowerCase())}</p><p>${e(a.actor)} · ${e(a.target)}</p><small>${e(dateTime(a.createdAt))}</small></div></div>`).join('') || empty('No activity yet', 'Administrative changes will appear here.')}</div>`, '<a class="text-brand text-[11px] font-semibold" href="#/admin/audit">View all</a>')}</div>` +
    panel('Recently joined', 'The newest members of your community', DataTable({ caption: 'Recently joined accounts', headings: ['Member', 'Role', 'Status', 'Joined'], rows: data.users.slice(0, 5).map(u => [person(u), Badge({ text: e(u.role.toLowerCase()) }), StatusBadge(u.status), e(dateTime(u.createdAt))]), empty: empty('No accounts yet', 'Accounts will appear after registration.') }), '<a class="text-brand text-[11px] font-semibold" href="#/admin/users">Manage users →</a>');
}
export function UsersView(data, state, staff = false) {
  const result = pageItems(filterUsers(data.users, { ...state, role: staff ? 'STAFF' : state.role }), state.page);
  state.page = result.page;
  return heading(staff ? 'Staff & permissions' : 'User management', staff ? 'Give your operations team the right access to support the community.' : 'Find members, review account access, and keep your community healthy.') + panel(staff ? 'Staff directory' : 'All users', `${result.total} ${staff ? 'staff accounts' : 'matching accounts'}`, `
    <form id="admin-filters" class="admin-toolbar"><label class="admin-field admin-search" for="admin-query">Search ${staff ? 'staff' : 'users'}<input id="admin-query" name="query" type="search" value="${e(state.query)}" placeholder="Search by name or email" maxlength="100"></label>${staff ? '' : select('role', 'Role', ['ADMIN', 'STAFF', 'MENTOR', 'MENTEE'], state.role, 'All roles')}${select('status', 'Status', ['ACTIVE', 'INACTIVE', 'LOCKED'], state.status, 'All statuses')}${Button({ label: 'Search', type: 'submit', variant: 'secondary' })}${Button({ id: 'admin-clear', label: 'Clear', variant: 'ghost' })}</form>
    ${DataTable({ caption: staff ? 'Staff accounts and permissions' : 'Community accounts', headings: ['Member', staff ? 'Permissions' : 'Role', 'Status', 'Joined (UTC)', 'Action'], rows: result.items.map(u => [person(u), staff ? `${u.permissions.length} of 4 assigned` : Badge({ text: e(u.role.toLowerCase()) }), StatusBadge(u.status), e(dateTime(u.createdAt).replace(' UTC', '')), `<button class="btn btn-outline btn-sm" data-${staff ? 'permissions' : 'user'}="${u.id}" aria-label="${staff ? 'Edit permissions for' : 'View account of'} ${e(u.name)}">${staff ? 'Edit permissions' : 'View account'}</button>`]), empty: empty() })}${pagination(result)}`);
}
export function RevenueView(data, state) {
  const report = revenue(data.payments, state.from, state.to);
  const result = pageItems(report.payments, state.page); state.page = result.page;
  return heading('Revenue reports', 'Verified payments and estimated commission before refunds and settlement.') +
    `<div class="admin-stats">${StatCard({ label: 'Gross payments', value: money(report.gross), note: 'Selected period · VND' })}${StatCard({ label: 'Estimated gross commission', value: money(report.commission), note: 'Original transaction rates' })}${StatCard({ label: 'Mentor share', value: money(report.gross - report.commission), note: 'Before refunds and settlement' })}${StatCard({ label: 'Verified transactions', value: report.payments.length, note: 'Successful payments only' })}</div>` +
    panel('Payment ledger', 'Amounts are gross of refunds. This report does not represent available escrow or payout balances.', `<form id="admin-dates" class="admin-toolbar"><label class="admin-field" for="from">From (UTC)<input type="date" id="from" name="from" value="${e(state.from)}"></label><label class="admin-field" for="to">To (UTC)<input type="date" id="to" name="to" value="${e(state.to)}"></label>${Button({ label: 'Apply dates', variant: 'secondary', type: 'submit' })}${Button({ label: 'All time', variant: 'ghost', id: 'admin-clear' })}${Button({ label: 'Export CSV', variant: 'outline', id: 'admin-export', disabled: !report.payments.length })}</form>${DataTable({ caption: 'Verified payments', headings: ['Reference', 'Paid at (UTC)', 'Gross amount', 'Commission', 'Rate', 'Status'], rows: result.items.map(p => [e(p.reference), e(dateTime(p.paidAt).replace(' UTC', '')), money(p.amount), money(paymentCommission(p)), `${e(p.commissionRate)}%`, StatusBadge(p.status)]), empty: empty('No verified payments', 'No successful transactions match this period.') })}${pagination(result)}`);
}
export function filterPayouts(requests, state = {}) {
  const q = (state.query || '').trim().toLowerCase();
  return requests.filter(item => {
    const date = (item.requestedAt || '').slice(0, 10);
    return (!state.status || item.status === state.status)
      && (!state.from || date >= state.from) && (!state.to || date <= state.to)
      && (!q || `${item.id} ${item.mentorName} ${item.mentorEmail} ${item.transferReference || ''}`.toLowerCase().includes(q));
  });
}
export function PayoutsView(requests = [], demo = false, state = {}) {
  const result = pageItems(filterPayouts(requests, state), state.page || 1);
  const rows = result.items.map(item => [
    `#${e(item.id)}<small class="block text-muted mt-1">${e(item.mentorName)} · ${e(item.mentorEmail)} · ID ${e(item.mentorId)}</small>`,
    `${money(item.netAmount ?? item.amount)}<small class="block text-muted mt-1">Wallet debit: ${money(item.amount)} · Fee: ${money(item.feeAmount)}</small>`,
    `${e(item.bankName)} · ${e(item.accountName)}<small class="block text-muted mt-1">${e(item.accountNumber)}</small>`,
    StatusBadge(item.status),
    `${e(dateTime(item.requestedAt))}<small class="block text-muted mt-1">Reviewed: ${item.reviewedAt ? e(dateTime(item.reviewedAt)) : '—'}<br>By: ${e(item.reviewedBy || '—')}</small>`,
    `<span class="block whitespace-normal max-w-xs">Reference: ${e(item.transferReference || '—')}<br>Reason: ${e(item.rejectionReason || '—')}</span>`,
    demo ? 'Demo mode — no live payouts.' : item.status === 'REQUESTED'
      ? `<div class="flex flex-wrap gap-2"><button class="btn btn-primary btn-sm" data-payout-paid="${e(item.id)}">Record transfer</button><button class="btn btn-outline btn-sm" data-payout-reject="${e(item.id)}">Reject</button></div>`
      : 'Completed · read only',
  ]);
  const toolbar = `<form id="admin-filters" class="admin-toolbar"><label class="admin-field admin-search" for="admin-query">Search payouts<input id="admin-query" name="query" type="search" maxlength="100" value="${e(state.query || '')}" placeholder="Mentor, email, payout ID or transfer reference"></label>${select('status', 'Status', ['REQUESTED', 'PAID', 'REJECTED'], state.status, 'All statuses')}${Button({ label: 'Search', type: 'submit', variant: 'secondary' })}${Button({ id: 'admin-clear', label: 'Clear', variant: 'ghost' })}</form>
    <form id="admin-dates" class="admin-toolbar"><label class="admin-field" for="from">Requested from (UTC)<input id="from" name="from" type="date" value="${e(state.from || '')}"></label><label class="admin-field" for="to">Requested to (UTC)<input id="to" name="to" type="date" value="${e(state.to || '')}"></label>${Button({ label: 'Apply dates', type: 'submit', variant: 'secondary' })}</form>`;
  return heading('Mentor payouts', 'Review withdrawal requests and payment history. Complete bank transfers outside HappyProgramming before recording them.') +
    panel('Payout history', `${requests.length} total · ${requests.filter(item => item.status === 'REQUESTED').length} awaiting review`, toolbar + DataTable({ caption: 'Mentor payout history', headings: ['Request / mentor', 'Bank transfer (net)', 'Bank destination', 'Status', 'Dates (UTC) / reviewer', 'Decision details', 'Actions'], rows, empty: empty('No payouts found', 'Try clearing the filters. New mentor requests will appear here.') }) + pagination(result));
}
export function SettingsView(data) {
  return heading('System settings', 'Manage platform contact details and the commission for new payments.') + panel('Platform configuration', 'Changes require a reason and are recorded in the audit log.', `<form id="admin-settings" class="admin-panel-body admin-form"><div class="admin-form-grid"><label class="admin-field" for="commissionRate">Platform commission (%)<input id="commissionRate" name="commissionRate" type="number" min="0" max="100" step="0.01" value="${e(data.settings.commissionRate)}" required><span class="text-muted font-normal">Only applies to future payments. Existing rates stay unchanged.</span></label><label class="admin-field" for="supportEmail">Support email<input id="supportEmail" name="supportEmail" type="email" maxlength="254" value="${e(data.settings.supportEmail)}" placeholder="support@example.com"><span class="text-muted font-normal">Shown in the website footer. Leave blank to hide support contact.</span></label></div><label class="admin-field" for="settings-reason">Reason for change<textarea id="settings-reason" name="reason" rows="3" required maxlength="1000" placeholder="Explain why this update is needed"></textarea></label><div class="admin-actions">${Button({ id: 'admin-settings-reset', label: 'Discard changes', variant: 'outline' })}${Button({ label: 'Review changes', type: 'submit' })}</div></form>`);
}
export function AuditView(data, state) {
  const q = state.query.toLowerCase().trim();
  const records = data.audit.filter(a => `${a.actor} ${a.action} ${a.target} ${a.reason || ''}`.toLowerCase().includes(q));
  const result = pageItems(records, state.page); state.page = result.page;
  return heading('Audit logs', 'An immutable history of account, staff authorization, and configuration changes.', Badge({ text: 'Read-only history' })) + panel('Activity history', 'All timestamps are shown in UTC. Audit records cannot be edited or deleted.', `<form id="admin-filters" class="admin-toolbar"><label class="admin-field admin-search" for="admin-query">Search activity<input id="admin-query" name="query" type="search" value="${e(state.query)}" placeholder="Search actor, action, target or reason" maxlength="100"></label>${Button({ label: 'Search', type: 'submit', variant: 'secondary' })}${Button({ id: 'admin-clear', label: 'Clear', variant: 'ghost' })}</form>${DataTable({ caption: 'Immutable audit records', headings: ['Timestamp (UTC)', 'Actor', 'Action / target', 'Reason', 'IP address'], rows: result.items.map(a => [e(dateTime(a.createdAt).replace(' UTC', '')), `${e(a.actor)}${a.actorId ? `<small class="block text-muted mt-1">ID ${e(a.actorId)}</small>` : ''}`, `<span class="font-semibold">${e(a.action)}</span><small class="block text-muted mt-1">${e(a.target)}</small>`, `<span class="block whitespace-normal min-w-40 max-w-xs">${e(a.reason || 'No reason recorded')}</span>`, e(a.ipAddress || 'Not recorded')]), empty: empty('No activity found', 'Try another search. New administrative changes appear here.') })}${pagination(result)}`);
}
