import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { bindUserDropdown, getInitials, renderNotificationBell, renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';
import { menteeDisputesService } from './menteeDisputesService.js';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const money = (value, currency = 'VND') => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0))} ${currency}`;
const dateLabel = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const statusLabels = { SUBMITTED: 'Submitted', IN_MEDIATION: 'In mediation', AWAITING_EVIDENCE: 'Awaiting evidence', APPROVED: 'Approved (Awaiting transfer)', RESOLVED: 'Resolved', REJECTED: 'Rejected' };
const categoryLabels = { NO_SHOW: 'Mentor no-show', QUALITY_MISMATCH: 'Quality mismatch', UNRESPONSIVE: 'Unresponsive mentor', CONDUCT_VIOLATION: 'Conduct violation', TECHNICAL_FAILURE: 'Technical failure', OTHER: 'Other' };

export function validateDisputeDraft({ target, category, description, termsAccepted, evidence }) {
  if (!target) return 'Select the booking or mentorship affected.';
  if (!category) return 'Select a dispute category.';
  const length = String(description || '').trim().length;
  if (length < 30 || length > 2000) return 'Description must contain between 30 and 2,000 characters.';
  if (!evidence?.length || evidence.length > 5) return 'Attach between 1 and 5 evidence images.';
  if (evidence.some(file => !ALLOWED_TYPES.has(file.type) || file.size > MAX_SIZE)) return 'Evidence must be PNG, JPG, or WEBP and no larger than 5 MB per image.';
  if (!termsAccepted) return 'Confirm that your complaint and evidence are authentic.';
  return '';
}

function badge(status) {
  const tone = status === 'RESOLVED' ? 'status-success' : status === 'APPROVED' ? 'status-warning' : status === 'REJECTED' ? 'status-danger' : status === 'IN_MEDIATION' ? 'status-warning' : 'status-neutral';
  return `<span class="status-badge ${tone}"><span aria-hidden="true">●</span>${esc(statusLabels[status] || status)}</span>`;
}

function table(items) {
  return `<section class="admin-panel overflow-hidden"><div class="admin-panel-heading"><div><p class="eyebrow mb-2">DISPUTE HISTORY</p><h2>Submitted complaints</h2><p>Track staff review and the final outcome for each complaint.</p></div><p class="text-xs text-muted">${items.length} dispute${items.length === 1 ? '' : 's'}</p></div><div class="data-table-scroll"><table class="data-table"><thead><tr><th>Ticket</th><th>Service</th><th>Category</th><th>Amount</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${items.map(item => `<tr><td><strong class="text-ink">${esc(item.ticketCode)}</strong><span class="mt-1 block text-[11px] text-muted">${esc(dateLabel(item.createdAt))}</span></td><td><strong class="text-ink">${esc(item.title)}</strong><span class="mt-1 block text-[11px] text-muted">${esc(item.mentorName)} · ${item.targetType === 'ONE_OFF' ? 'One-off session' : 'Monthly'}</span></td><td>${esc(categoryLabels[item.category] || item.category)}</td><td><strong>${esc(money(item.disputedAmount, item.currency))}</strong></td><td>${badge(item.status)}</td><td><button class="btn btn-outline btn-sm" type="button" data-dispute-detail="${item.id}">Details</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function detailMarkup(item) {
  const evidence = item.evidence?.map(file => `<a class="block overflow-hidden rounded-xl border border-line bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" href="${menteeDisputesService.evidenceUrl(item.id, file.id)}" target="_blank" rel="noopener"><img class="h-32 w-full object-cover" src="${menteeDisputesService.evidenceUrl(item.id, file.id)}" alt="Evidence: ${esc(file.fileName)}"><span class="block truncate p-2 text-[10px] text-muted">${esc(file.fileName)}</span></a>`).join('') || '';
  return `<button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button><p class="eyebrow mt-4">DISPUTE DETAILS</p><div class="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 class="font-display text-3xl text-ink">${esc(item.ticketCode)}</h2>${badge(item.status)}</div><p class="mt-2 text-sm text-muted">${esc(item.title)} with ${esc(item.mentorName)}</p><div class="mt-6 divide-y divide-line rounded-xl border border-line bg-cream"><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Category</span><strong>${esc(categoryLabels[item.category] || item.category)}</strong></div><div class="flex justify-between gap-4 p-4 text-sm"><span class="text-muted">Disputed amount</span><strong>${esc(money(item.disputedAmount, item.currency))}</strong></div><div class="p-4 text-sm"><span class="text-muted">Your statement</span><p class="mt-2 whitespace-pre-wrap text-ink">${esc(item.description)}</p></div></div><h3 class="mt-6 text-sm font-semibold text-ink">Initial evidence</h3><div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">${evidence}</div>${item.status === 'APPROVED' ? `
  <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-amber-500"></span>
      <strong class="text-sm font-semibold text-amber-900">Refund Approved · Awaiting Admin Bank Transfer</strong>
    </div>
    <p class="mt-2 text-xs leading-5 text-amber-800">${esc(item.resolutionNote || 'Staff has reviewed and approved your refund request. The administrator will execute the bank transfer shortly.')}</p>
    ${item.refundAmount != null ? `<p class="mt-3 text-sm font-semibold text-amber-950">Refund Amount: ${esc(money(item.refundAmount, item.currency))}</p>` : ''}
    ${item.bankName ? `<div class="mt-2 p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs text-amber-900">Receiving Bank: <strong>${esc(item.bankName)}</strong> · Account: <strong>${esc(item.accountNumber)}</strong> (${esc(item.accountName)})</div>` : ''}
    <p class="mt-2 text-[11px] text-amber-700 italic">Dispute is in the payout queue. You will see the bank transfer reference once processed.</p>
  </div>
` : (item.resolutionType || item.status === 'RESOLVED' || item.status === 'REJECTED') ? `
  <div class="mt-6 rounded-xl border border-line bg-lilac p-4">
    <strong class="text-sm text-ink">${esc(item.resolutionType || item.status)}</strong>
    <p class="mt-2 text-xs leading-5 text-muted">${esc(item.resolutionNote || '')}</p>
    ${item.refundAmount != null ? `<p class="mt-3 text-sm font-semibold text-brand">Refund: ${esc(money(item.refundAmount, item.currency))}</p>` : ''}
    ${item.bankName ? `<div class="mt-2 text-xs text-ink">Bank: <strong>${esc(item.bankName)}</strong> · Account: <strong>${esc(item.accountNumber)}</strong> (${esc(item.accountName)})</div>` : ''}
    ${item.transferReference ? `<div class="mt-1 text-xs text-muted">Bank Transfer Reference: <strong class="font-mono text-ink">${esc(item.transferReference)}</strong></div>` : ''}
    ${item.receiptFileId ? `
      <div class="mt-3.5 pt-3 border-t border-line">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-ink">Transfer Receipt / Evidence:</span>
          <a class="text-xs text-brand hover:underline font-medium" href="${menteeDisputesService.receiptUrl(item.id)}" target="_blank" rel="noopener">Open full size ↗</a>
        </div>
        <a href="${menteeDisputesService.receiptUrl(item.id)}" target="_blank" rel="noopener" class="inline-block border border-line rounded-lg overflow-hidden bg-white p-1 hover:border-brand transition">
          <img src="${menteeDisputesService.receiptUrl(item.id)}" alt="Transfer Receipt" class="max-h-48 rounded object-contain" />
        </a>
      </div>
    ` : ''}
  </div>
` : '<p class="mt-6 rounded-xl border border-line bg-cream p-4 text-xs leading-5 text-muted">Staff has not issued a decision yet. You can track status here while the complaint is reviewed.</p>'}`;
}

function formMarkup(targets) {
  return `<button class="modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button><p class="eyebrow mt-4">FILE A DISPUTE</p><h2 class="mt-2 font-display text-3xl text-ink">Report a mentorship issue</h2><p class="mt-2 text-sm leading-6 text-muted">Submit clear details and timestamped image evidence. Staff will review the complaint.</p><form id="dispute-form" class="mt-6 space-y-5" novalidate><label class="block text-xs font-semibold text-ink">Booking or mentorship<select name="target" required class="mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm focus:border-brand focus:outline-none"><option value="">Select a paid service</option>${targets.map(item => `<option value="${item.targetType}:${item.targetId}">${esc(item.title)} · ${esc(item.mentorName)} · ${esc(dateLabel(item.scheduledAt))}</option>`).join('')}</select></label><label class="block text-xs font-semibold text-ink">Category<select name="category" required class="mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm focus:border-brand focus:outline-none"><option value="">Select a category</option>${Object.entries(categoryLabels).map(([value, label]) => `<option value="${value}">${esc(label)}</option>`).join('')}</select></label><label class="block text-xs font-semibold text-ink">What happened?<textarea name="description" minlength="30" maxlength="2000" rows="6" required class="mt-2 w-full resize-y rounded-lg border border-line bg-white p-3.5 text-sm leading-6 focus:border-brand focus:outline-none" placeholder="Explain what occurred, what was agreed, and the outcome you are requesting."></textarea><span class="mt-1 block text-right text-[10px] text-muted" data-description-count>0 / 2,000</span></label><div><span class="text-xs font-semibold text-ink">Image evidence</span><p class="mt-1 text-[11px] text-muted">Attach 1–5 PNG, JPG, or WEBP images, up to 5 MB each.</p><label class="btn btn-outline btn-sm mt-3 cursor-pointer">Choose images<input class="sr-only" name="evidence" type="file" accept=".png,.jpg,.jpeg,.webp" multiple required></label><div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" data-evidence-preview></div></div><div class="rounded-xl border border-line bg-cream p-4 space-y-3">
  <div>
    <span class="text-xs font-semibold text-ink">Receiving Bank Details (Optional)</span>
    <p class="mt-0.5 text-[11px] text-muted">If a refund is approved, Admin will transfer directly to this account.</p>
  </div>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <label class="block text-xs text-muted">Bank Name
      <input name="bankName" type="text" maxlength="100" class="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none" placeholder="e.g. MB Bank">
    </label>
    <label class="block text-xs text-muted">Account Number
      <input name="accountNumber" type="text" maxlength="50" class="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none" placeholder="e.g. 0123456789">
    </label>
    <label class="block text-xs text-muted">Account Name
      <input name="accountName" type="text" maxlength="150" class="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none" placeholder="e.g. NGUYEN VAN A">
    </label>
  </div>
</div>
<label class="flex items-start gap-3 rounded-xl border border-line bg-cream p-4 text-xs leading-5 text-muted"><input name="termsAccepted" type="checkbox" class="mt-1 accent-brand"><span>I confirm that the details and images are authentic and understand that fraudulent claims may lead to account penalties.</span></label><p class="hidden rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert" data-form-error></p><div class="flex justify-end gap-3"><button type="button" class="btn btn-outline" data-cancel>Cancel</button><button type="submit" class="btn btn-primary" data-submit>Submit dispute</button></div></form>`;
}

export async function mountMenteeDisputes(root) {
  const user = authService.getCurrentUser();
  if (!user) { root.innerHTML = '<main class="min-h-screen bg-cream grid place-items-center p-8"><div class="text-center"><h1 class="font-display text-3xl text-ink">Log in to view disputes</h1><a href="#/login" class="btn btn-primary mt-6">Log in</a></div></main>'; return; }
  const name = user.name || user.email || 'Account';
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-3" aria-label="Main navigation">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}</nav></div></header><main class="min-h-screen bg-cream"><section class="container max-w-6xl py-12 sm:py-16"><div class="flex flex-wrap items-end justify-between gap-5"><div><p class="eyebrow">YOUR ACCOUNT</p><h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">My disputes</h1><p class="mt-4 text-sm text-muted">Submit complaints and track staff review in one place.</p></div><button type="button" class="btn btn-primary" data-file-dispute>File a dispute</button></div><div id="disputes-results" class="mt-8" role="status" aria-live="polite">Loading your disputes…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const results = root.querySelector('#disputes-results');
  let disputes = []; let targets = [];

  const render = () => { results.innerHTML = disputes.length ? `<section class="mb-5 rounded-2xl border border-line bg-white p-5 shadow-sm"><label class="block max-w-56 text-xs font-semibold text-ink">Status<select data-status-filter class="mt-2 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All statuses</option>${Object.entries(statusLabels).map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></label></section><div data-dispute-table>${table(disputes)}</div>` : '<div class="rounded-2xl border border-line bg-white p-10 text-center shadow-sm"><h2 class="font-display text-2xl text-ink">No disputes submitted</h2><p class="mt-3 text-sm text-muted">If a paid service has a serious issue, use the dispute form and provide evidence.</p></div>'; };
  async function reload() { [disputes, targets] = await Promise.all([menteeDisputesService.list(), menteeDisputesService.eligibleTargets()]); render(); }

  root.addEventListener('change', event => {
    if (!event.target.matches('[data-status-filter]')) return;
    const filtered = event.target.value ? disputes.filter(item => item.status === event.target.value) : disputes;
    root.querySelector('[data-dispute-table]').innerHTML = filtered.length ? table(filtered) : '<div class="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">No disputes match this status.</div>';
  });
  root.addEventListener('click', async event => {
    if (event.target.closest('[data-file-dispute]')) {
      if (!targets.length) { window.alert('No paid booking or trial mentorship is currently inside its dispute window.'); return; }
      const dialog = document.createElement('dialog'); dialog.className = 'modal'; dialog.innerHTML = formMarkup(targets); root.append(dialog);
      const form = dialog.querySelector('#dispute-form'); const input = form.elements.evidence; const preview = dialog.querySelector('[data-evidence-preview]'); const error = dialog.querySelector('[data-form-error]'); const count = dialog.querySelector('[data-description-count]'); let urls = [];
      const close = () => { urls.forEach(URL.revokeObjectURL); if (dialog.open) dialog.close(); dialog.remove(); };
      dialog.querySelector('.modal-close').addEventListener('click', close); dialog.querySelector('[data-cancel]').addEventListener('click', close); dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
      form.elements.description.addEventListener('input', () => { count.textContent = `${form.elements.description.value.length} / 2,000`; });
      input.addEventListener('change', () => { urls.forEach(URL.revokeObjectURL); urls = [...input.files].slice(0,5).map(URL.createObjectURL); preview.innerHTML = urls.map((url,index) => `<figure class="overflow-hidden rounded-xl border border-line bg-cream"><img class="h-28 w-full object-cover" src="${url}" alt="Selected evidence ${index + 1}"><figcaption class="truncate p-2 text-[10px] text-muted">${esc(input.files[index].name)}</figcaption></figure>`).join(''); });
      form.addEventListener('submit', async e => { e.preventDefault(); const [targetType,targetId] = form.elements.target.value.split(':'); const values = { target: form.elements.target.value, targetType, targetId, category: form.elements.category.value, description: form.elements.description.value, bankName: form.elements.bankName?.value, accountNumber: form.elements.accountNumber?.value, accountName: form.elements.accountName?.value, termsAccepted: form.elements.termsAccepted.checked, evidence: [...input.files] }; const message = validateDisputeDraft(values); error.classList.toggle('hidden', !message); error.textContent = message; if (message) return; const submit = dialog.querySelector('[data-submit]'); submit.disabled = true; submit.textContent = 'Submitting…'; try { const created = await menteeDisputesService.submit(values); close(); await reload(); const saved = disputes.find(item => item.id === created.id); if (saved) root.querySelector(`[data-dispute-detail="${saved.id}"]`)?.focus(); } catch (err) { error.textContent = err.message || 'Could not submit dispute.'; error.classList.remove('hidden'); submit.disabled = false; submit.textContent = 'Submit dispute'; } });
      dialog.showModal(); return;
    }
    const detailButton = event.target.closest('[data-dispute-detail]');
    if (detailButton) { detailButton.disabled = true; try { const item = await menteeDisputesService.get(detailButton.dataset.disputeDetail); const dialog = document.createElement('dialog'); dialog.className = 'modal'; dialog.innerHTML = detailMarkup(item); root.append(dialog); const close = () => { if (dialog.open) dialog.close(); dialog.remove(); }; dialog.querySelector('.modal-close').addEventListener('click', close); dialog.addEventListener('click', e => { if (e.target === dialog) close(); }); dialog.showModal(); } catch (err) { window.alert(err.message || 'Could not load dispute.'); } finally { detailButton.disabled = false; } }
  });
  try { await reload(); } catch (error) { results.innerHTML = `<div class="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800" role="alert">${esc(error.message || 'Could not load disputes.')}</div>`; }
}
