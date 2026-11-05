import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorDisputeService } from './mentorDisputeService.js';
import { renderPagination, bindPagination } from '../../shared/pagination.js';
import { escapeHtml as e } from '../../shared/html.js';

const dateTime = value => value
  ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
  : '—';
const PAGE_SIZE = 5;

const STATUS_LABELS = { SUBMITTED: 'Submitted', IN_MEDIATION: 'In mediation', RESOLVED: 'Resolved', REJECTED: 'Rejected' };
const STATUS_TONES = { SUBMITTED: 'warning', IN_MEDIATION: 'neutral', RESOLVED: 'success', REJECTED: 'danger' };
const RESOLUTION_LABELS = { FULL_REFUND: 'Full refund', PARTIAL_REFUND: 'Partial refund' };
const REASON_LABELS = {
  NO_SHOW: 'Mentor no-show',
  QUALITY: 'Session quality',
  SCHEDULING: 'Scheduling',
  COMMUNICATION: 'Communication',
  PAYMENT: 'Payment',
  OTHER: 'Other',
};
const SIDE_LABELS = { MENTEE: 'Mentee', MENTOR: 'You', STAFF: 'HappyProgramming staff' };

export function resolutionLabel(resolution) {
  return RESOLUTION_LABELS[resolution] || '';
}

export function statusLabel(item = {}) {
  if (item.status === 'RESOLVED') {
    const resolution = resolutionLabel(item.resolution);
    return resolution ? `Resolved – ${resolution}` : 'Resolved';
  }
  return STATUS_LABELS[item.status] || String(item.status || '—');
}

export function reasonLabel(reasonCode) {
  if (!reasonCode) return 'Other';
  return REASON_LABELS[reasonCode] || String(reasonCode).replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function statusBadge(item) {
  const tone = STATUS_TONES[item.status] || 'neutral';
  return `<span class="status-badge status-${tone}"><span aria-hidden="true">●</span> ${e(statusLabel(item))}</span>`;
}

function fileSizeLabel(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function evidenceList(disputeId, items = []) {
  if (!items.length) return '<p class="text-sm text-muted">No files were attached.</p>';
  return `<ul class="space-y-2">${items.map(item => `<li>
      <a class="flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:border-brand" href="${e(mentorDisputeService.evidenceUrl(disputeId, item.id))}">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lilac text-base text-brand" aria-hidden="true">↧</span>
        <span class="min-w-0"><strong class="block truncate text-sm text-ink">${e(item.fileName || 'Attachment')}</strong>
        <small class="text-muted">${e(fileSizeLabel(item.sizeBytes))} · ${e(SIDE_LABELS[item.uploadedSide] || item.uploadedSide || '')} · Download</small></span>
      </a></li>`).join('')}</ul>`;
}

function renderDisputeCard(item) {
  const needsResponse = item.status === 'SUBMITTED' || item.status === 'IN_MEDIATION';
  return `<article class="rounded-xl border border-line bg-white p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-semibold text-ink">${e(item.targetLabel || 'Mentorship')}</p>
          ${statusBadge(item)}
        </div>
        <p class="mt-1 text-xs text-muted">Dispute #${e(String(item.id))} · ${e(reasonLabel(item.reasonCode))} · raised by ${e(item.complainantName || 'a mentee')} · ${e(dateTime(item.createdAt))}</p>
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted">${e(item.description || '')}</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-2">
        ${needsResponse
          ? `<span class="text-xs ${item.responded ? 'text-muted' : 'font-semibold text-brand'}">${item.responded ? 'Response sent' : 'Response needed'}</span>`
          : `<span class="text-xs text-muted">Closed by staff</span>`}
        <button class="btn btn-outline btn-sm" type="button" data-dispute-id="${e(String(item.id))}">View details</button>
      </div>
    </div>
  </article>`;
}

function renderOutcome(detail) {
  if (detail.status !== 'RESOLVED' && detail.status !== 'REJECTED') return '';
  const outcome = detail.status === 'RESOLVED'
    ? `Resolved – ${resolutionLabel(detail.resolution) || 'refund'}`
    : 'Rejected';
  return `<section class="admin-panel mb-5">
    <div class="admin-panel-heading"><div><h2>Staff decision</h2><p>Decided on ${e(dateTime(detail.resolvedAt))}. Refund decisions are made by HappyProgramming staff only.</p></div></div>
    <div class="admin-panel-body">
      <p class="text-sm"><strong class="text-ink">${e(outcome)}</strong></p>
      <p class="mt-2 text-sm leading-6 text-muted">${e(detail.resolutionNote || 'No additional note was provided.')}</p>
    </div>
  </section>`;
}

function renderResponseThread(detail) {
  const responses = detail.responses || [];
  if (!responses.length) return '<p class="text-sm text-muted">No responses yet.</p>';
  return `<ol class="space-y-4">${responses.map(item => `<li class="rounded-xl border border-line bg-cream p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-semibold text-ink">${e(SIDE_LABELS[item.authorSide] || item.authorSide || 'Participant')}</p>
        <p class="text-xs text-muted">${e(dateTime(item.createdAt))}</p>
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">${e(item.message || '')}</p>
      <div class="mt-3">${evidenceList(detail.id, item.evidence)}</div>
    </li>`).join('')}</ol>`;
}

export function renderDisputeDetail(detail) {
  const open = detail.status === 'SUBMITTED' || detail.status === 'IN_MEDIATION';
  return `
    <button id="dispute-back" class="btn btn-outline btn-sm mb-5" type="button">← Back to disputes</button>
    <div class="admin-page-heading"><div>
      <p class="eyebrow mb-3">DISPUTE DETAIL</p>
      <h1>${e(detail.targetLabel || 'Mentorship')}</h1>
      <p>Dispute #${e(String(detail.id))} · ${e(reasonLabel(detail.reasonCode))} · raised by ${e(detail.complainantName || 'a mentee')} on ${e(dateTime(detail.createdAt))}</p>
      <p class="mt-3">${statusBadge(detail)}</p>
    </div></div>
    <section class="admin-panel mb-5">
      <div class="admin-panel-heading"><div><h2>Complaint</h2><p>What the mentee reported and the evidence they uploaded.</p></div></div>
      <div class="admin-panel-body">
        <p class="whitespace-pre-wrap text-sm leading-6 text-ink">${e(detail.description || '')}</p>
        <div class="mt-4">${evidenceList(detail.id, detail.evidence)}</div>
      </div>
    </section>
    ${renderOutcome(detail)}
    <section class="admin-panel mb-5">
      <div class="admin-panel-heading"><div><h2>Response thread</h2><p>Explanations from you, the mentee, and HappyProgramming staff.</p></div></div>
      <div class="admin-panel-body">${renderResponseThread(detail)}</div>
    </section>
    ${open ? `<section class="admin-panel">
      <div class="admin-panel-heading"><div><h2>Provide your response</h2><p>Explain your side and attach proof. Staff review every response; you cannot approve a refund or close this dispute.</p></div></div>
      <div class="admin-panel-body">
        <form id="dispute-response-form" novalidate>
          <label class="admin-field w-full" for="dispute-response-message">Your explanation
            <textarea id="dispute-response-message" class="w-full" rows="5" maxlength="2000" required
              placeholder="Describe what happened, what you already offered the mentee, and any evidence you attach."></textarea>
          </label>
          <label class="admin-field mt-4 w-full" for="dispute-response-files">Attachments (optional, up to 5 files, 10 MB each)
            <input id="dispute-response-files" class="w-full" type="file" multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip">
          </label>
          <p id="dispute-response-error" class="admin-notice notice-error mt-4" role="alert" hidden></p>
          <p id="dispute-response-success" class="admin-notice mt-4" role="status" hidden></p>
          <div class="admin-actions mt-5">
            <button id="dispute-response-submit" class="btn btn-primary" type="submit">Submit response for review</button>
          </div>
        </form>
      </div>
    </section>` : `<div class="admin-notice" role="status">This dispute is closed. Responses are no longer accepted.</div>`}`;
}

function disputesContent() {
  return `
    <div id="dispute-loading" class="text-sm text-muted" role="status">Loading your disputes…</div>
    <div id="dispute-error" class="admin-notice notice-error mb-4" role="alert" hidden></div>
    <button id="dispute-retry" class="btn btn-outline mb-4" type="button" hidden>Try again</button>
    <section id="dispute-list-view">
      <div class="admin-page-heading"><div>
        <p class="eyebrow mb-3">DISPUTE MANAGEMENT</p>
        <h1>Disputes</h1>
        <p>Refund complaints raised by your mentees. Send your explanation and evidence; HappyProgramming staff decide the outcome.</p>
      </div></div>
      <div class="admin-toolbar mb-5">
        <label class="admin-field" for="dispute-status-filter">Status
          <select id="dispute-status-filter" class="w-full">
            <option value="ALL">All disputes</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_MEDIATION">In mediation</option>
            <option value="RESOLVED">Resolved – full / partial refund</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <p id="dispute-result-count" class="text-xs text-muted" aria-live="polite"></p>
      </div>
      <div id="dispute-empty" class="rounded-2xl border border-line bg-white p-8 text-center" hidden>
        <p class="eyebrow mb-2">NO DISPUTES</p>
        <h2 class="font-display text-2xl text-ink">No disputes to review</h2>
        <p id="dispute-empty-detail" class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">If a mentee raises a refund complaint about one of your sessions, it will appear here.</p>
      </div>
      <div id="dispute-list" class="space-y-4"></div>
      <div id="dispute-pagination"></div>
    </section>
    <section id="dispute-detail-view" hidden></section>`;
}

export function MentorDisputesPage() {
  return MentorLayout(disputesContent(), authService.getCurrentUser(), 'disputes');
}

export function initializeMentorDisputesPage(root) {
  const shell = root.matches?.('.admin-shell') ? root : root.querySelector('.admin-shell');
  if (!shell) return () => {};
  const unbindLayout = bindMentorLayout(shell);
  const loading = shell.querySelector('#dispute-loading');
  const error = shell.querySelector('#dispute-error');
  const retry = shell.querySelector('#dispute-retry');
  const listView = shell.querySelector('#dispute-list-view');
  const detailView = shell.querySelector('#dispute-detail-view');
  const filter = shell.querySelector('#dispute-status-filter');
  const resultCount = shell.querySelector('#dispute-result-count');
  const empty = shell.querySelector('#dispute-empty');
  const emptyEyebrow = empty.querySelector('.eyebrow');
  const emptyTitle = empty.querySelector('h2');
  const emptyDetail = shell.querySelector('#dispute-empty-detail');
  const list = shell.querySelector('#dispute-list');
  const pagination = shell.querySelector('#dispute-pagination');

  let disputes = [];
  let detail = null;
  let page = 1;
  let request = 0;
  let disposed = false;

  function showFailure(message) {
    error.textContent = message || 'Unable to load your disputes.';
    error.hidden = false;
    retry.hidden = false;
  }

  function renderList() {
    const totalPages = Math.max(1, Math.ceil(disputes.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);
    const slice = disputes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    list.innerHTML = slice.map(renderDisputeCard).join('');
    pagination.innerHTML = renderPagination({ page, totalPages, label: 'Dispute pages' });
    if (!disputes.length) {
      const filtered = filter.value !== 'ALL';
      empty.hidden = false;
      emptyEyebrow.textContent = filtered ? 'NO MATCHES' : 'NO DISPUTES';
      emptyTitle.textContent = filtered ? 'No disputes with this status' : 'No disputes to review';
      emptyDetail.textContent = filtered
        ? 'No disputes match the selected status. Choose “All disputes” to see everything.'
        : 'If a mentee raises a refund complaint about one of your sessions, it will appear here.';
      resultCount.textContent = '';
    } else {
      empty.hidden = true;
      resultCount.textContent = `Showing ${slice.length} of ${disputes.length} dispute${disputes.length === 1 ? '' : 's'}`;
    }
  }

  function showList() {
    detail = null;
    detailView.innerHTML = '';
    detailView.hidden = true;
    listView.hidden = false;
    renderList();
  }

  function bindDetail() {
    const back = detailView.querySelector('#dispute-back');
    const form = detailView.querySelector('#dispute-response-form');
    back?.addEventListener('click', showList);
    form?.addEventListener('submit', submitResponse);
  }

  async function showDetail(disputeId) {
    const current = ++request;
    loading.hidden = false;
    error.hidden = true; retry.hidden = true;
    try {
      const loaded = await mentorDisputeService.get(disputeId);
      if (disposed || current !== request) return;
      detail = loaded;
      listView.hidden = true;
      detailView.innerHTML = renderDisputeDetail(loaded);
      detailView.hidden = false;
      bindDetail();
      detailView.querySelector('#dispute-response-message')?.focus();
    } catch (loadError) {
      if (disposed || current !== request) return;
      showFailure(loadError.message);
    } finally {
      if (!disposed && current === request) loading.hidden = true;
    }
  }

  async function submitResponse(event) {
    event.preventDefault();
    if (!detail) return;
    const form = event.currentTarget;
    const message = detailView.querySelector('#dispute-response-message');
    const files = detailView.querySelector('#dispute-response-files');
    const submit = detailView.querySelector('#dispute-response-submit');
    const formError = detailView.querySelector('#dispute-response-error');
    const formSuccess = detailView.querySelector('#dispute-response-success');
    const text = (message?.value || '').trim();
    formError.hidden = true; formSuccess.hidden = true;
    if (text.length < 5) {
      formError.textContent = 'Write an explanation of at least 5 characters.';
      formError.hidden = false;
      message?.focus();
      return;
    }
    const selected = Array.from(files?.files || []);
    if (selected.length > 5) {
      formError.textContent = 'Attach at most 5 files per response.';
      formError.hidden = false;
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    try {
      const updated = await mentorDisputeService.respond(detail.id, text, selected);
      detail = updated;
      detailView.innerHTML = renderDisputeDetail(updated);
      bindDetail();
      const success = detailView.querySelector('#dispute-response-success');
      if (success) {
        success.textContent = 'Response submitted. HappyProgramming staff will review it.';
        success.hidden = false;
      }
      await loadList(false);
    } catch (submitError) {
      formError.textContent = submitError.message || 'Unable to submit your response.';
      formError.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Submit response for review';
    }
  }

  async function loadList(resetPage = true) {
    const current = ++request;
    loading.hidden = false;
    error.hidden = true; retry.hidden = true;
    try {
      const items = await mentorDisputeService.list(filter.value);
      if (disposed || current !== request) return;
      disputes = Array.isArray(items) ? items : [];
      if (resetPage) page = 1;
      if (!detail) renderList();
    } catch (loadError) {
      if (disposed || current !== request) return;
      showFailure(loadError.message);
    } finally {
      if (!disposed && current === request) loading.hidden = true;
    }
  }

  const reload = () => { if (detail) void showDetail(detail.id); else void loadList(); };
  const onFilter = () => { showList(); void loadList(); };
  const onListClick = event => {
    const button = event.target.closest('[data-dispute-id]');
    if (!button) return;
    void showDetail(Number(button.dataset.disputeId));
  };
  const unbindPagination = bindPagination(pagination, { onChange: next => { page = next; renderList(); } });

  retry.addEventListener('click', reload);
  filter.addEventListener('change', onFilter);
  list.addEventListener('click', onListClick);
  void loadList();

  return () => {
    disposed = true;
    retry.removeEventListener('click', reload);
    filter.removeEventListener('change', onFilter);
    list.removeEventListener('click', onListClick);
    unbindPagination();
    unbindLayout();
  };
}
