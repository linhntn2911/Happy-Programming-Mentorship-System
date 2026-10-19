import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { menteeTransactionsService } from './menteeTransactionsService.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const money = (value, currency) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0))} ${currency || 'VND'}`;
const dateLabel = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const statusLabel = { SUCCEEDED: 'Paid', PENDING: 'Pending', EXPIRED: 'Expired', CANCELLED: 'Cancelled', FAILED: 'Failed' };

function row(item) {
  const status = item.status || 'PENDING';
  return `<tr><td><strong class="text-ink">${esc(item.mentorName)}</strong><span class="mt-1 block text-[11px] text-muted">${esc(dateLabel(item.paidAt || item.createdAt))}</span></td><td><span class="font-semibold text-ink">${esc(item.packageName)}</span><span class="mt-1 inline-flex rounded-full border border-brand/30 bg-lilac px-2 py-0.5 text-[10px] font-semibold text-dark-purple">${esc(item.serviceType === 'ONE_OFF' ? 'One-off session' : 'Monthly')}</span></td><td><span class="text-sm font-semibold text-ink">${esc(money(item.amount, item.currency))}</span><span class="mt-1 block text-[11px] text-muted">${item.gatewayTransactionId ? `SePay: ${esc(item.gatewayTransactionId)}` : item.merchantReference ? `Reference: ${esc(item.merchantReference)}` : 'Payment attempt'}</span></td><td><span class="status-badge ${status === 'SUCCEEDED' ? 'status-success' : status === 'PENDING' ? 'status-warning' : status === 'FAILED' ? 'status-danger' : 'status-neutral'}">${esc(statusLabel[status] || status)}</span></td><td><button class="btn btn-outline btn-sm" type="button" data-transaction-detail="${esc(item.paymentId)}">Details</button></td></tr>`;
}

function renderTable(items) {
  return `<section class="admin-panel overflow-hidden"><div class="admin-panel-heading"><div><p class="eyebrow mb-2">PAYMENT HISTORY</p><h2>All transactions</h2><p>Payments and payment attempts made through HappyProgramming.</p></div><p class="text-xs text-muted">${items.length} transaction${items.length === 1 ? '' : 's'}</p></div><div class="data-table-scroll"><table class="data-table"><thead><tr><th>Mentor</th><th>Package / session</th><th>Amount</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${items.map(row).join('')}</tbody></table></div></section>`;
}

export async function mountMenteeTransactions(root) {
  const user = authService.getCurrentUser();
  if (!user) { root.innerHTML = '<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><h1 class="font-display text-4xl">My transactions</h1><p class="mt-4 text-muted">Log in to view your payment history.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>'; return; }
  const name = user.name || user.email || 'Account';
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header><main class="min-h-screen bg-cream"><section class="container max-w-5xl py-12 sm:py-16"><p class="eyebrow">YOUR ACCOUNT</p><h1 class="mt-3 font-display text-4xl sm:text-5xl text-ink">My transactions</h1><p class="mt-4 text-sm text-muted">Review payments and payment attempts made through HappyProgramming.</p><div id="transactions-results" class="mt-8" role="status" aria-live="polite">Loading your transactions…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const results = root.querySelector('#transactions-results');
  try {
    const data = await menteeTransactionsService.list();
    if (!data.length) { results.innerHTML = '<div class="rounded-2xl border border-line bg-white p-10 text-center shadow-sm"><h2 class="font-display text-2xl text-ink">No transactions yet</h2><p class="mt-3 text-sm text-muted">Your verified payments will appear here.</p><a href="#/mentors" class="btn btn-primary mt-6">Browse mentors</a></div>'; return; }
    results.innerHTML = `<section class="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"><div class="flex flex-wrap items-end justify-between gap-5"><label class="block text-xs font-semibold text-ink">Status<select id="transaction-status-filter" class="mt-2 min-w-48 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All statuses</option><option value="SUCCEEDED">Paid</option><option value="PENDING">Pending</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option><option value="FAILED">Failed</option></select></label><label class="block text-xs font-semibold text-ink">Type<select id="transaction-type-filter" class="mt-2 min-w-48 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All types</option><option value="MONTHLY">Monthly</option><option value="ONE_OFF">One-off session</option></select></label><p id="transaction-count" class="text-xs text-muted"></p></div></section><div id="transaction-table" class="mt-5"></div>`;
    const statusFilter = root.querySelector('#transaction-status-filter'); const typeFilter = root.querySelector('#transaction-type-filter'); const table = root.querySelector('#transaction-table'); const count = root.querySelector('#transaction-count');
    const render = () => { const filtered = data.filter(item => (!statusFilter.value || item.status === statusFilter.value) && (!typeFilter.value || item.serviceType === typeFilter.value)); count.textContent = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`; table.innerHTML = filtered.length ? renderTable(filtered) : '<div class="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">No transactions match these filters.</div>'; };
    results.addEventListener('click', event => {
      const button = event.target.closest('[data-transaction-detail]');
      if (!button) return;
      const item = data.find(transaction => String(transaction.paymentId) === button.dataset.transactionDetail);
      if (!item) return;
      const status = item.status || 'PENDING';
      const dialog = document.createElement('dialog');
      dialog.className = 'modal';
      dialog.innerHTML = `<button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button><p class="eyebrow mt-4">TRANSACTION DETAILS</p><h2 class="mt-2 font-display text-3xl text-ink">${esc(item.packageName)}</h2><p class="mt-2 text-sm text-muted">Payment with ${esc(item.mentorName)}</p><div class="mt-6 divide-y divide-line rounded-xl border border-line bg-cream"><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Status</span><span class="status-badge ${status === 'SUCCEEDED' ? 'status-success' : status === 'PENDING' ? 'status-warning' : status === 'FAILED' ? 'status-danger' : 'status-neutral'}">${esc(statusLabel[status] || status)}</span></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Amount</span><strong>${esc(money(item.amount, item.currency))}</strong></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Type</span><strong>${esc(item.serviceType === 'ONE_OFF' ? 'One-off session' : 'Monthly mentorship')}</strong></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Date</span><strong>${esc(dateLabel(item.paidAt || item.createdAt))}</strong></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Payment reference</span><strong class="break-all text-right">${esc(item.merchantReference || '—')}</strong></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">SePay transaction</span><strong class="break-all text-right">${esc(item.gatewayTransactionId || '—')}</strong></div></div>`;
      root.append(dialog);
      const close = () => { dialog.close(); dialog.remove(); };
      dialog.querySelector('.modal-close').addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      dialog.showModal();
    });
    statusFilter.addEventListener('change', render); typeFilter.addEventListener('change', render); render();
  }
  catch (error) { results.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800" role="alert">${esc(error.message || 'Could not load your transactions.')}</div>`; }
}
