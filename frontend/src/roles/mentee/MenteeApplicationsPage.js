import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { menteeApplicationsService } from './menteeApplicationsService.js';
import { menteeDisputesService } from './menteeDisputesService.js';
import { applicationDisplayStatus, canPayApplication } from './applicationPayment.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const PAGE_SIZE = 10;
const STATUS_LABELS = { PENDING: 'Pending', ACCEPTED: 'Accepted', REJECTED: 'Declined', EXPIRED: 'Expired', CANCELLED: 'Cancelled', PAID: 'Confirmed', DISPUTED: 'Disputed' };
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

function openReportModal(booking, onSubmitted) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal w-full max-w-2xl';
  let evidenceFiles = [];

  function renderForm() {
    dialog.innerHTML = `
      <button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button>
      <p class="eyebrow mt-4">DISPUTE MEDIATION</p>
      <h2 class="mt-2 font-display text-2xl text-ink">Report mentorship issue</h2>
      <p class="mt-1 text-sm text-muted">For <strong>${esc(booking.packageName || 'Mentorship')}</strong> with ${esc(booking.mentorName || 'Mentor')} (Request #${esc(booking.requestId)})</p>
      <div class="report-error hidden my-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert"></div>
      <form class="mt-4 space-y-4" data-report-form>
        <div>
          <label class="block text-xs font-semibold text-ink mb-1.5" for="report-category">Issue category</label>
          <select id="report-category" name="category" required class="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink focus:border-brand focus:outline-none">
            <option value="" disabled selected>Select category...</option>
            <option value="NO_SHOW">Mentor did not attend (No-show)</option>
            <option value="QUALITY_MISMATCH">Content/Quality does not match commitment</option>
            <option value="UNRESPONSIVE">Mentor unresponsive (> 72 hours)</option>
            <option value="CONDUCT_VIOLATION">Unprofessional conduct / Harassment</option>
            <option value="TECHNICAL_FAILURE">Technical platform / Room malfunction</option>
            <option value="OTHER">Other issue</option>
          </select>
        </div>
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label class="block text-xs font-semibold text-ink" for="report-description">Detailed description</label>
            <span class="text-[11px] text-muted" data-char-count>0 / 2,000 (min 30)</span>
          </div>
          <textarea id="report-description" name="description" rows="4" required minlength="30" maxlength="2000"
            class="w-full rounded-xl border border-line bg-white p-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            placeholder="Describe what occurred, any agreements made, and why you are requesting assistance (minimum 30 characters)..."></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-ink mb-1.5">Image evidence (1 to 5 images, max 5MB each)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" data-file-input>
          <button type="button" class="btn btn-outline btn-sm w-full flex items-center justify-center gap-2" data-btn-upload>
            📷 Attach screenshots / photo proof
          </button>
          <div class="mt-2.5 flex flex-wrap gap-2" data-preview-container></div>
        </div>
        <label class="flex items-start gap-2.5 text-xs text-muted cursor-pointer pt-1">
          <input type="checkbox" name="terms" required class="mt-0.5 rounded text-brand focus:ring-brand">
          <span>I confirm that the details and images provided are authentic and accurate. Escrow payout for this booking will be frozen during arbitration.</span>
        </label>
        <div class="mt-6 flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" class="btn btn-outline" data-cancel-btn>Cancel</button>
          <button type="submit" class="btn btn-primary" data-submit-btn>Submit report</button>
        </div>
      </form>
    `;

    const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
    dialog.querySelector('.modal-close').addEventListener('click', close);
    dialog.querySelector('[data-cancel-btn]').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });

    const form = dialog.querySelector('[data-report-form]');
    const errorBox = dialog.querySelector('.report-error');
    const descInput = dialog.querySelector('#report-description');
    const charCount = dialog.querySelector('[data-char-count]');
    const fileInput = dialog.querySelector('[data-file-input]');
    const uploadBtn = dialog.querySelector('[data-btn-upload]');
    const previewContainer = dialog.querySelector('[data-preview-container]');
    const submitBtn = dialog.querySelector('[data-submit-btn]');

    descInput.addEventListener('input', () => {
      charCount.textContent = `${descInput.value.length} / 2,000 (min 30)`;
      charCount.className = descInput.value.length < 30 ? 'text-[11px] text-rose-600 font-semibold' : 'text-[11px] text-muted';
    });

    uploadBtn.addEventListener('click', () => fileInput.click());

    function updatePreviews() {
      previewContainer.innerHTML = evidenceFiles.map((file, idx) => {
        const url = URL.createObjectURL(file);
        return `<div class="relative h-16 w-16 rounded-lg border border-line overflow-hidden group">
          <img src="${url}" alt="Evidence ${idx + 1}" class="h-full w-full object-cover">
          <button type="button" data-remove-idx="${idx}" class="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">✕</button>
        </div>`;
      }).join('');
    }

    fileInput.addEventListener('change', () => {
      const selected = Array.from(fileInput.files || []);
      for (const file of selected) {
        if (evidenceFiles.length >= 5) break;
        if (file.size > 5 * 1024 * 1024) {
          errorBox.textContent = `File "${file.name}" exceeds the 5MB size limit.`;
          errorBox.classList.remove('hidden');
          return;
        }
        if (!file.type.startsWith('image/')) {
          errorBox.textContent = `File "${file.name}" is not a supported image.`;
          errorBox.classList.remove('hidden');
          return;
        }
        evidenceFiles.push(file);
      }
      fileInput.value = '';
      errorBox.classList.add('hidden');
      updatePreviews();
    });

    previewContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-idx]');
      if (removeBtn) {
        const idx = Number(removeBtn.dataset.removeIdx);
        evidenceFiles.splice(idx, 1);
        updatePreviews();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.add('hidden');

      if (evidenceFiles.length === 0) {
        errorBox.textContent = 'Please attach at least 1 image evidence (screenshot or photo).';
        errorBox.classList.remove('hidden');
        return;
      }
      if (descInput.value.trim().length < 30) {
        errorBox.textContent = 'Description must be at least 30 characters long.';
        errorBox.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting report…';

      try {
        const result = await menteeDisputesService.submit({
          requestId: booking.requestId,
          category: form.category.value,
          description: descInput.value.trim(),
          termsAccepted: form.terms.checked,
          evidence: evidenceFiles,
        });

        dialog.innerHTML = `
          <button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button>
          <div class="py-4 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold">✓</div>
            <p class="eyebrow mt-4">REPORT SUBMITTED</p>
            <h2 class="mt-2 font-display text-2xl text-ink">Dispute Ticket Created</h2>
            <div class="mt-4 divide-y divide-line rounded-xl border border-line bg-cream text-left text-sm">
              <div class="flex justify-between p-3"><span class="text-muted">Ticket Code</span><strong class="font-mono text-brand">${esc(result.ticketCode || 'HP-DSP')}</strong></div>
              <div class="flex justify-between p-3"><span class="text-muted">Status</span><span class="status-badge status-warning">● SUBMITTED</span></div>
              <div class="flex justify-between p-3"><span class="text-muted">Escrow Status</span><strong class="text-rose-600">Frozen (Dispute Hold)</strong></div>
            </div>
            <p class="mt-4 text-xs text-muted leading-relaxed">Your report has been logged. Support staff will inspect the claim and open the 3-party dispute mediation room with your mentor. Any pending payout for this session is on hold.</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <button type="button" class="btn btn-primary w-full" data-finish-btn>Done</button>
            </div>
          </div>
        `;
        dialog.querySelector('.modal-close').addEventListener('click', close);
        dialog.querySelector('[data-finish-btn]').addEventListener('click', () => {
          close();
          onSubmitted();
        });
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit report';
        errorBox.textContent = err.message || 'Could not submit dispute. Please try again.';
        errorBox.classList.remove('hidden');
      }
    });
  }

  renderForm();
  document.body.append(dialog);
  dialog.showModal();
}

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
          ? `<button type="button" class="btn btn-outline" data-open-report="${esc(booking.requestId)}">Report an issue</button><a class="btn btn-primary" href="#/workspace?requestId=${encodeURIComponent(booking.requestId)}">Open workspace →</a>`
          : status === 'CANCELLED'
            ? '<a class="btn btn-outline" href="#/mentors">Browse mentors to apply again →</a>'
            : '';
      const cancel = ['PENDING', 'ACCEPTED'].includes(status) && !booking.fundedAt
        ? `<button type="button" class="btn btn-outline" data-cancel-application="${encodeURIComponent(booking.requestId)}">Cancel booking</button>` : '';
      dialog.innerHTML = `<button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button><p class="eyebrow mt-4">BOOKING DETAILS</p><h2 class="mt-2 font-display text-3xl text-ink">${esc(booking.packageName || 'Mentorship')}</h2><p class="mt-2 text-sm text-muted">with ${esc(booking.mentorName || 'Mentor')}</p><div class="mt-6 divide-y divide-line rounded-xl border border-line bg-cream"><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Status</span><span class="status-badge ${status === 'PAID' ? 'status-success' : status === 'PENDING' || status === 'ACCEPTED' ? 'status-warning' : 'status-neutral'}">${esc(STATUS_LABELS[status] || status)}</span></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Submitted</span><strong>${esc(dateLabel(booking.submittedAt))}</strong></div><div class="p-4 text-sm"><span class="text-muted">Learning goals</span><p class="mt-2 whitespace-pre-wrap text-ink">${esc(booking.learningGoals || 'No learning goals provided.')}</p></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Payment</span><strong>${esc(booking.latestPaymentStatus || 'Not started')}</strong></div></div><div class="mt-6 flex flex-wrap justify-end gap-3">${cancel}${action}</div>`;
      results.append(dialog);
      const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
      dialog.querySelector('.modal-close').addEventListener('click', close);
      dialog.addEventListener('click', event => {
        if (event.target === dialog) close();
        const reportBtn = event.target.closest('[data-open-report]');
        if (reportBtn) {
          close();
          openReportModal(booking, () => load());
        }
      });
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
