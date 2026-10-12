import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { menteeApplicationsService } from './menteeApplicationsService.js';
import { applicationDisplayStatus, canPayApplication } from './applicationPayment.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const PAGE_SIZE = 10;
const STATUS_LABELS = { PENDING: 'Waiting for mentor', ACCEPTED: 'Accepted', REJECTED: 'Declined', EXPIRED: 'Expired', CANCELLED: 'Cancelled', PAID: 'Paid' };
const STATUS_STYLE = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  ACCEPTED: 'border-brand/20 bg-lilac text-dark-purple',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
  EXPIRED: 'border-line bg-cream text-muted',
  CANCELLED: 'border-line bg-cream text-muted',
};
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

function applicationCard(application) {
  const status = applicationDisplayStatus(application);
  const paid = status === 'PAID';
  const paymentLabel = canPayApplication(application)
    ? `<a class="btn btn-primary btn-sm" href="#/checkout?requestId=${encodeURIComponent(application.requestId)}">${application.latestPaymentStatus === 'PENDING' ? 'Continue payment' : 'Pay now'} →</a>`
      : paid
        ? `<a class="btn btn-primary btn-sm" href="#/workspace?requestId=${encodeURIComponent(application.requestId)}">Open workspace →</a>`
        : status === 'CANCELLED'
          ? '<a class="btn btn-outline btn-sm" href="#/mentors">Browse mentors to apply again →</a>'
        : status === 'PENDING'
          ? '<span class="text-xs text-muted">Payment becomes available after mentor acceptance.</span>'
          : '';
  const cancelAction = ['PENDING', 'ACCEPTED'].includes(status) && !application.fundedAt
    ? `<button type="button" class="btn btn-outline btn-sm" data-cancel-application="${encodeURIComponent(application.requestId)}">Cancel application</button>`
    : '';
  const goals = application.learningGoals || 'No learning goals provided.';
  return `<article class="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><p class="eyebrow">${esc(application.packageName || 'Monthly mentorship')}</p><h2 class="mt-2 font-display text-2xl text-ink">${esc(application.mentorName || 'Mentor')}</h2><p class="mt-1 text-xs text-muted">Submitted ${esc(dateLabel(application.submittedAt))}</p></div>
      <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.CANCELLED}">${esc(STATUS_LABELS[status] || status)}</span>
    </div>
    <p class="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">${esc(goals)}</p>
    ${application.rejectionReason ? `<p class="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><strong>Mentor's note:</strong> ${esc(application.rejectionReason)}</p>` : ''}
    <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"><p class="text-xs text-muted">${status === 'PENDING' && application.responseDeadline ? `Response expected by ${esc(dateLabel(application.responseDeadline))}` : paid ? `Payment status: ${esc(application.latestPaymentStatus || 'SUCCEEDED')}` : application.latestPaymentStatus ? `Latest payment: ${esc(application.latestPaymentStatus)}` : 'Payment status: Not started'}</p><div class="flex flex-wrap items-center gap-3">${cancelAction}${paymentLabel}</div></div>
  </article>`;
}

export async function mountMenteeApplications(root) {
  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = `<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><p class="eyebrow">YOUR LEARNING</p><h1 class="mt-3 font-display text-4xl">My applications</h1><p class="mt-4 text-muted">Log in to manage your mentorship applications.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>`;
    return;
  }
  const name = user.name || user.email || 'Account';
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header>
    <main class="min-h-screen bg-cream"><section class="container max-w-5xl py-12 sm:py-16"><p class="eyebrow">YOUR LEARNING</p><h1 class="mt-3 font-display text-4xl sm:text-5xl text-ink">My applications</h1><p class="mt-4 text-sm text-muted">Track mentor decisions and continue payment for accepted applications.</p>
    <div class="mt-8 flex flex-wrap items-end justify-between gap-4"><label class="block text-xs font-semibold text-ink" for="application-status">Filter by status<select id="application-status" class="mt-2 min-w-52 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All applications</option><option value="PENDING">Waiting for mentor</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Declined</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option></select></label><a href="#/notifications" class="text-xs font-semibold text-brand hover:underline">Notification history →</a></div>
    <div id="mentee-applications-results" class="mt-6" role="status" aria-live="polite">Loading your applications…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const results = root.querySelector('#mentee-applications-results');
  const statusFilter = root.querySelector('#application-status');
  let page = 0;
  let currentRequest = 0;

  async function load() {
    const request = ++currentRequest;
    results.textContent = 'Loading your applications…';
    try {
      const data = await menteeApplicationsService.list({ page, size: PAGE_SIZE, status: statusFilter.value });
      if (request !== currentRequest || !results.isConnected) return;
      const applications = data.applications || [];
      results.innerHTML = applications.length
        ? `<p class="mb-4 text-xs text-muted">${data.totalElements} application${data.totalElements === 1 ? '' : 's'}</p><div class="space-y-4">${applications.map(applicationCard).join('')}</div>${data.totalPages > 1 ? `<nav class="mt-7 flex items-center justify-between" aria-label="Application pages"><button type="button" data-page="previous" class="btn btn-outline btn-sm" ${page === 0 ? 'disabled' : ''}>← Previous</button><span class="text-xs text-muted">Page ${page + 1} of ${data.totalPages}</span><button type="button" data-page="next" class="btn btn-outline btn-sm" ${page + 1 >= data.totalPages ? 'disabled' : ''}>Next →</button></nav>` : ''}`
        : `<div class="rounded-2xl border border-line bg-white p-10 text-center shadow-sm"><h2 class="font-display text-2xl text-ink">No applications yet</h2><p class="mt-3 text-sm text-muted">When you apply for monthly mentorship, you can track every decision here.</p><a href="#/mentors" class="btn btn-primary mt-6">Browse mentors</a></div>`;
    } catch (error) {
      if (request !== currentRequest || !results.isConnected) return;
      results.innerHTML = `<div class="rounded-2xl border border-line bg-white p-8 text-center"><h2 class="font-display text-2xl text-ink">Could not load applications</h2><p class="mt-3 text-sm text-muted">${esc(error.message || 'Please try again.')}</p><button type="button" data-retry class="btn btn-outline btn-sm mt-5">Try again</button></div>`;
    }
  }

  statusFilter.addEventListener('change', () => { page = 0; load(); });
  results.addEventListener('click', event => {
    if (event.target.closest('[data-retry]')) { load(); return; }
    const cancelButton = event.target.closest('[data-cancel-application]');
    if (cancelButton) {
      const requestId = decodeURIComponent(cancelButton.dataset.cancelApplication);
      if (!window.confirm('Cancel this application? You can then submit a new application using the mentor’s current package.')) return;
      cancelButton.disabled = true;
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
