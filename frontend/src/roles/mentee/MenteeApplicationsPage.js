import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { menteeApplicationsService } from './menteeApplicationsService.js';
import { applicationDisplayStatus, canPayApplication } from './applicationPayment.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const PAGE_SIZE = 10;
const STATUS_LABELS = { PENDING: 'Pending', ACCEPTED: 'Accepted', REJECTED: 'Declined', EXPIRED: 'Expired', CANCELLED: 'Cancelled', PAID: 'Confirmed' };
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

function applicationCard(application) {
  const status = applicationDisplayStatus(application);
  const paid = status === 'PAID';
  const goals = application.learningGoals || 'No learning goals provided.';
  return `<tr>
      <td><strong class="text-ink">${esc(application.mentorName || 'Mentor')}</strong><span class="mt-1 block text-[11px] text-muted">Submitted ${esc(dateLabel(application.submittedAt))}</span></td><td><span class="font-semibold text-ink">${esc(application.packageName || 'Monthly mentorship')}</span><span class="mt-1 block max-w-xs truncate text-[11px] text-muted" title="${esc(goals)}">${esc(goals)}</span></td><td><span class="status-badge ${status === 'PAID' ? 'status-success' : status === 'PENDING' || status === 'ACCEPTED' ? 'status-warning' : status === 'REJECTED' ? 'status-danger' : 'status-neutral'}">${esc(STATUS_LABELS[status] || status)}</span></td><td><span class="text-xs text-muted">${status === 'PENDING' && application.responseDeadline ? `Response by ${esc(dateLabel(application.responseDeadline))}` : paid ? `Payment: ${esc(application.latestPaymentStatus || 'SUCCEEDED')}` : application.latestPaymentStatus ? `Payment: ${esc(application.latestPaymentStatus)}` : 'Payment not started'}</span></td><td><button type="button" class="btn btn-outline btn-sm" data-booking-detail="${esc(application.requestId)}">Details</button></td>
  </tr>`;
}

function bookingsTable(applications, total) {
  return `<section class="admin-panel overflow-hidden"><div class="admin-panel-heading"><div><p class="eyebrow mb-2">BOOKING HISTORY</p><h2>All bookings</h2><p>Manage your monthly mentorships and one-off sessions in one place.</p></div><p class="text-xs text-muted">${total} booking${total === 1 ? '' : 's'}</p></div><div class="data-table-scroll"><table class="data-table"><thead><tr><th>Mentor</th><th>Package / session</th><th>Status</th><th>Schedule / deadline</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${applications.map(applicationCard).join('')}</tbody></table></div></section>`;
}

export async function mountMenteeApplications(root) {
  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = `<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><p class="eyebrow">YOUR BOOKINGS</p><h1 class="mt-3 font-display text-4xl">My bookings</h1><p class="mt-4 text-muted">Log in to manage your bookings.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>`;
    return;
  }
  const name = user.name || user.email || 'Account';
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header>
    <main class="min-h-screen bg-cream"><section class="container max-w-6xl py-12 sm:py-16"><p class="eyebrow">YOUR BOOKINGS</p><h1 class="mt-3 font-display text-4xl sm:text-5xl text-ink">My bookings</h1><p class="mt-4 text-sm text-muted">Manage your monthly mentorships, one-off sessions, payments, and booking status.</p>
    <div class="mt-8 flex flex-wrap items-end justify-between gap-4"><label class="block text-xs font-semibold text-ink" for="application-status">Booking status<select id="application-status" class="mt-2 min-w-52 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All bookings</option><option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Declined</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option></select></label><a href="#/notifications" class="text-xs font-semibold text-brand hover:underline">Notification history →</a></div>
    <div id="mentee-applications-results" class="mt-6" role="status" aria-live="polite">Loading your bookings…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const results = root.querySelector('#mentee-applications-results');
  const statusFilter = root.querySelector('#application-status');
  let page = 0;
  let currentRequest = 0;
  let loadedBookings = [];

  async function load() {
    const request = ++currentRequest;
    results.textContent = 'Loading your bookings…';
    try {
      const data = await menteeApplicationsService.list({ page, size: PAGE_SIZE, status: statusFilter.value });
      if (request !== currentRequest || !results.isConnected) return;
      const applications = data.applications || [];
      loadedBookings = applications;
      results.innerHTML = applications.length
        ? `${bookingsTable(applications, data.totalElements)}${data.totalPages > 1 ? `<nav class="mt-7 flex items-center justify-between" aria-label="Booking pages"><button type="button" data-page="previous" class="btn btn-outline btn-sm" ${page === 0 ? 'disabled' : ''}>← Previous</button><span class="text-xs text-muted">Page ${page + 1} of ${data.totalPages}</span><button type="button" data-page="next" class="btn btn-outline btn-sm" ${page + 1 >= data.totalPages ? 'disabled' : ''}>Next →</button></nav>` : ''}`
        : `<div class="rounded-2xl border border-line bg-white p-10 text-center shadow-sm"><h2 class="font-display text-2xl text-ink">No bookings yet</h2><p class="mt-3 text-sm text-muted">Your monthly mentorships and one-off sessions will appear here.</p><a href="#/mentors" class="btn btn-primary mt-6">Browse mentors</a></div>`;
    } catch (error) {
      if (request !== currentRequest || !results.isConnected) return;
      results.innerHTML = `<div class="rounded-2xl border border-line bg-white p-8 text-center"><h2 class="font-display text-2xl text-ink">Could not load applications</h2><p class="mt-3 text-sm text-muted">${esc(error.message || 'Please try again.')}</p><button type="button" data-retry class="btn btn-outline btn-sm mt-5">Try again</button></div>`;
    }
  }

  statusFilter.addEventListener('change', () => { page = 0; load(); });
  results.addEventListener('click', event => {
    if (event.target.closest('[data-retry]')) { load(); return; }
    const detailButton = event.target.closest('[data-booking-detail]');
    if (detailButton) {
      const booking = loadedBookings.find(item => String(item.requestId) === detailButton.dataset.bookingDetail);
      if (!booking) return;
      const status = applicationDisplayStatus(booking);
      const paid = status === 'PAID';
      const dialog = document.createElement('dialog');
      dialog.className = 'modal';
      const action = canPayApplication(booking)
        ? `<a class="btn btn-primary" href="#/checkout?requestId=${encodeURIComponent(booking.requestId)}">${booking.latestPaymentStatus === 'PENDING' ? 'Continue payment' : 'Pay now'} →</a>`
        : paid
          ? `<a class="btn btn-primary" href="#/workspace?requestId=${encodeURIComponent(booking.requestId)}">Open workspace →</a>`
          : status === 'CANCELLED'
            ? '<a class="btn btn-outline" href="#/mentors">Browse mentors to apply again →</a>'
            : '';
      const cancel = ['PENDING', 'ACCEPTED'].includes(status) && !booking.fundedAt
        ? `<button type="button" class="btn btn-outline" data-cancel-application="${encodeURIComponent(booking.requestId)}">Cancel booking</button>` : '';
      dialog.innerHTML = `<button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button><p class="eyebrow mt-4">BOOKING DETAILS</p><h2 class="mt-2 font-display text-3xl text-ink">${esc(booking.packageName || 'Mentorship')}</h2><p class="mt-2 text-sm text-muted">with ${esc(booking.mentorName || 'Mentor')}</p><div class="mt-6 divide-y divide-line rounded-xl border border-line bg-cream"><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Status</span><span class="status-badge ${status === 'PAID' ? 'status-success' : status === 'PENDING' || status === 'ACCEPTED' ? 'status-warning' : 'status-neutral'}">${esc(STATUS_LABELS[status] || status)}</span></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Submitted</span><strong>${esc(dateLabel(booking.submittedAt))}</strong></div><div class="p-4 text-sm"><span class="text-muted">Learning goals</span><p class="mt-2 whitespace-pre-wrap text-ink">${esc(booking.learningGoals || 'No learning goals provided.')}</p></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Payment</span><strong>${esc(booking.latestPaymentStatus || 'Not started')}</strong></div></div><div class="mt-6 flex flex-wrap justify-end gap-3">${cancel}${action}</div>`;
      results.append(dialog);
      const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
      dialog.querySelector('.modal-close').addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      dialog.showModal();
      return;
    }
    const cancelButton = event.target.closest('[data-cancel-application]');
    if (cancelButton) {
      const requestId = decodeURIComponent(cancelButton.dataset.cancelApplication);
      if (!window.confirm('Cancel this application? You can then submit a new application using the mentor’s current package.')) return;
      cancelButton.disabled = true;
      cancelButton.closest('dialog')?.close();
      menteeApplicationsService.cancel(requestId)
        .then(() => load())
        .catch(error => {
          if (!results.isConnected) return;
          const notice = document.createElement('p');
          notice.className = 'mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800';
          notice.setAttribute('role', 'alert');
          notice.textContent = error.message || 'Could not cancel this application.';
          results.prepend(notice);
          cancelButton.disabled = false;
        });
      return;
    }
    const button = event.target.closest('[data-page]');
    if (button) { page += button.dataset.page === 'next' ? 1 : -1; load(); }
  });
  load();
}
