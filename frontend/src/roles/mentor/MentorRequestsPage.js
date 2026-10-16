import { mentorDashboardService } from './mentorDashboardService.js';
import {
  formatSlaRemaining,
  formatUtcDate,
  summarizeLearningGoals,
} from './MentorDashboardPage.js';

export function MentorRequestsPage() {
  return `
<main id="mentor-requests" class="container max-w-7xl py-8 sm:py-12">
  <nav class="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Mentor navigation">
    <a href="#/mentor/dashboard" class="font-medium text-brand underline-offset-4 hover:underline">← Dashboard</a>
    <a href="#/mentor/profile" class="font-medium text-brand underline-offset-4 hover:underline">Edit profile</a>
    <a href="#/mentor/packages" class="font-medium text-brand underline-offset-4 hover:underline">Packages</a>
  </nav>
  <header class="mb-8">
    <p class="eyebrow">MENTOR WORKSPACE</p>
    <h1 class="section-title mt-2">Mentorship requests</h1>
    <p class="section-copy mt-3">Review new applications and revisit every decision. Respond to pending requests within 48 hours.</p>
  </header>

  <div id="action-status" class="mb-6 p-4 rounded-xl hidden" role="status" aria-live="polite"></div>

  <div id="requests-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your requests…
  </div>
  <div id="requests-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="requests-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>

  <div id="requests-content" hidden>
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <label for="request-status-filter" class="text-xs font-semibold text-ink">Show requests
        <select id="request-status-filter" class="mt-2 min-w-52 rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none">
          <option value="ALL">All requests</option>
          <option value="PENDING">Waiting for my decision</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Declined</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <p id="requests-count" class="text-xs text-muted" aria-live="polite"></p>
    </div>
    <div id="requests-empty" class="rounded-2xl border border-line bg-white p-6 text-sm text-muted" hidden>
      No requests match this status.
    </div>
    <div id="requests-table-wrap" class="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
      <table class="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead class="bg-lilac/60 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" class="px-4 py-3">Mentee Name</th>
            <th scope="col" class="px-4 py-3">Package</th>
            <th scope="col" class="px-4 py-3">Learning Goals Summary</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3">Response deadline</th>
            <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody id="requests-rows" class="divide-y divide-line"></tbody>
      </table>
    </div>
    <div id="requests-cards" class="grid gap-3 md:hidden"></div>
  </div>

  <div id="request-dialog-overlay" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
    <div id="request-dialog" class="relative mx-auto my-auto w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="request-dialog-title" tabindex="-1">
      <div class="flex items-start justify-between gap-4 p-6 pb-5">
        <div><p class="eyebrow">MENTORSHIP REQUEST DETAILS</p><h2 id="request-dialog-title" class="mt-2 font-display text-3xl text-ink">Mentee application</h2><p class="mt-1 text-sm text-muted">Review the saved application before deciding.</p></div>
        <button type="button" data-close-dialog class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-lilac text-xl text-muted hover:text-ink" aria-label="Close request details">×</button>
      </div>
      <div class="mx-6 border-t border-line"></div>
      <dl class="grid gap-4 p-6 sm:grid-cols-2">
        <div><dt class="text-sm font-semibold text-ink">Mentee</dt><dd id="request-dialog-mentee" class="mt-1 break-words text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Package</dt><dd id="request-dialog-package" class="mt-1 break-words text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Request type</dt><dd id="request-dialog-type" class="mt-1 text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Current status</dt><dd id="request-dialog-status" class="mt-1 text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Submitted</dt><dd id="request-dialog-submitted" class="mt-1 text-sm text-muted"></dd></div>
        <div class="sm:col-span-2"><dt class="text-sm font-semibold text-ink">Learning goals</dt><dd id="request-dialog-goals" class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Response deadline</dt><dd id="request-dialog-deadline" class="mt-1 text-sm text-muted"></dd></div>
      </dl>
      <div class="flex flex-col-reverse gap-3 border-t border-line p-6 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" data-close-dialog class="btn btn-outline">Close</button>
        <div class="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" id="request-dialog-reject" data-dialog-action="REJECTED" class="btn btn-outline">Decline request</button>
          <button type="button" id="request-dialog-accept" data-dialog-action="ACCEPTED" class="btn btn-primary">Accept request</button>
        </div>
      </div>
    </div>
  </div>
</main>`;
}

function createDetailsButton(requestId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline btn-sm !px-3';
  button.textContent = 'Details';
  button.dataset.detailsId = String(requestId);
  return button;
}

function createSlaElement(request) {
  const element = document.createElement('span');
  element.className = 'text-xs font-semibold text-ink';
  element.dataset.slaId = String(request.id);
  element.dataset.deadline = request.responseDeadline || '';
  element.textContent = formatSlaRemaining(request.responseDeadline);
  return element;
}

const REQUEST_STATUS_LABELS = {
  PENDING: 'Waiting for mentor decision',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
const REQUEST_STATUS_STYLES = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
  EXPIRED: 'border-line bg-cream text-muted',
  CANCELLED: 'border-line bg-cream text-muted',
};

function createStatusElement(request) {
  const status = request.status || 'UNKNOWN';
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${REQUEST_STATUS_STYLES[status] || REQUEST_STATUS_STYLES.EXPIRED}`;
  badge.textContent = REQUEST_STATUS_LABELS[status] || status;
  return badge;
}

const REQUEST_TYPE_LABELS = {
  ONE_OFF: 'One-off session',
  MONTHLY: 'Monthly',
};

function requestTypeLabel(serviceType) {
  return REQUEST_TYPE_LABELS[serviceType] || 'Monthly';
}

function createTypeBadge(serviceType) {
  const badge = document.createElement('span');
  const oneOff = serviceType === 'ONE_OFF';
  badge.className = `ml-2 inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${oneOff ? 'border-brand/30 bg-lilac text-brand' : 'border-line bg-cream text-muted'}`;
  badge.textContent = requestTypeLabel(serviceType);
  return badge;
}

function renderRows(root, requests) {
  const rows = root.querySelector('#requests-rows');
  const cards = root.querySelector('#requests-cards');
  const empty = root.querySelector('#requests-empty');
  const tableWrap = root.querySelector('#requests-table-wrap');
  rows.replaceChildren();
  cards.replaceChildren();
  empty.hidden = requests.length > 0;
  tableWrap.hidden = requests.length === 0;

  for (const request of requests) {
    const row = document.createElement('tr');
    const cells = [
      request.menteeName || 'Mentee unavailable',
      request.packageName || 'Offering unavailable',
      summarizeLearningGoals(request.learningGoalsSummary || request.learningGoals),
    ];
    for (const [index, value] of cells.entries()) {
      const cell = document.createElement('td');
      cell.className = 'px-4 py-4 align-top text-sm text-ink';
      cell.textContent = value;
      if (index === 1) cell.append(createTypeBadge(request.serviceType));
      row.append(cell);
    }
    const statusCell = document.createElement('td');
    statusCell.className = 'px-4 py-4 align-top';
    statusCell.append(createStatusElement(request));
    row.append(statusCell);

    const deadlineCell = document.createElement('td');
    deadlineCell.className = 'px-4 py-4 align-top text-xs text-muted';
    if (request.status === 'PENDING') deadlineCell.append(createSlaElement(request));
    else deadlineCell.textContent = formatUtcDate(request.responseDeadline);
    row.append(deadlineCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'px-4 py-4 align-top';
    actionCell.append(createDetailsButton(request.id));
    row.append(actionCell);
    rows.append(row);

    const card = document.createElement('article');
    card.className = 'rounded-2xl border border-line bg-white p-4 shadow-sm';
    const heading = document.createElement('div');
    heading.className = 'flex flex-wrap items-start justify-between gap-2';
    const name = document.createElement('h3');
    name.className = 'font-semibold text-ink';
    name.textContent = request.menteeName || 'Mentee unavailable';
    const packageName = document.createElement('p');
    packageName.className = 'mt-1 text-sm text-muted';
    packageName.textContent = request.packageName || 'Offering unavailable';
    packageName.append(createTypeBadge(request.serviceType));
    heading.append(name, packageName);
    const status = createStatusElement(request);
    heading.append(status);
    const goalsLabel = document.createElement('p');
    goalsLabel.className = 'mt-4 text-xs font-semibold uppercase tracking-wide text-muted';
    goalsLabel.textContent = 'Learning goals';
    const goals = document.createElement('p');
    goals.className = 'mt-1 text-sm leading-6 text-ink';
    goals.textContent = summarizeLearningGoals(request.learningGoalsSummary || request.learningGoals);
    const sla = document.createElement('p');
    sla.className = 'mt-3 flex flex-wrap items-center gap-2 text-xs text-muted';
    sla.append(request.status === 'PENDING' ? 'Response due: ' : 'Deadline: ');
    sla.append(request.status === 'PENDING' ? createSlaElement(request) : formatUtcDate(request.responseDeadline));
    const actionWrap = document.createElement('div');
    actionWrap.className = 'mt-4';
    actionWrap.append(createDetailsButton(request.id));
    card.append(heading, goalsLabel, goals, sla, actionWrap);
    cards.append(card);
  }

  root.dataset.requestCount = String(requests.length);
}

export function initializeMentorRequestsPage() {
  const root = document.querySelector('#mentor-requests');
  if (!root) return () => { };

  const loading = root.querySelector('#requests-loading');
  const content = root.querySelector('#requests-content');
  const error = root.querySelector('#requests-error');
  const retry = root.querySelector('#requests-retry');
  const actionStatus = root.querySelector('#action-status');
  const statusFilter = root.querySelector('#request-status-filter');
  const requestCount = root.querySelector('#requests-count');
  const empty = root.querySelector('#requests-empty');
  const dialog = root.querySelector('#request-dialog');
  const dialogOverlay = root.querySelector('#request-dialog-overlay');
  const acceptButton = root.querySelector('#request-dialog-accept');
  const rejectButton = root.querySelector('#request-dialog-reject');

  const requestsById = new Map();
  let allRequests = [];
  let activeRequestId = null;
  let busy = false;
  let disposed = false;
  let actionStatusTimer;

  function setDialogButtonsEnabled(enabled) {
    acceptButton.disabled = !enabled;
    rejectButton.disabled = !enabled;
  }

  function isActionable(request) {
    const deadline = Date.parse(request?.responseDeadline);
    return request?.status === 'PENDING' && Number.isFinite(deadline) && deadline > Date.now();
  }

  function updateSlaTimers() {
    for (const timer of root.querySelectorAll('[data-sla-id]')) {
      timer.textContent = formatSlaRemaining(timer.dataset.deadline);
    }
  }

  function setActionStatus(message, type = 'success') {
    if (!actionStatus) return;
    actionStatus.textContent = message;
    if (type === 'success') {
      actionStatus.className = 'mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800';
    } else {
      actionStatus.className = 'mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800';
    }
    actionStatus.hidden = false;
    window.clearTimeout(actionStatusTimer);
    actionStatusTimer = window.setTimeout(() => {
      actionStatus.hidden = true;
    }, 5000);
  }

  function closeDialog() {
    dialogOverlay.classList.add('hidden');
    dialogOverlay.classList.remove('flex');
    activeRequestId = null;
  }

  function applyRequests(requests) {
    requestsById.clear();
    for (const request of requests) {
      requestsById.set(String(request.id), request);
    }
    renderRows(root, requests);
    requestCount.textContent = `${requests.length} request${requests.length === 1 ? '' : 's'}`;
    empty.textContent = statusFilter.value === 'ALL'
      ? 'No mentorship requests have been submitted yet.'
      : `No ${REQUEST_STATUS_LABELS[statusFilter.value]?.toLowerCase() || 'matching'} requests.`;
    updateSlaTimers();
  }

  function applyStatusFilter() {
    const requests = statusFilter.value === 'ALL'
      ? allRequests
      : allRequests.filter(request => request.status === statusFilter.value);
    applyRequests(requests);
  }

  async function loadRequests({ background = false } = {}) {
    if (!background) {
      loading.hidden = false;
      content.hidden = true;
      retry.hidden = true;
      error.hidden = true;
      actionStatus.hidden = true;
    }
    let data;
    try {
      data = await mentorDashboardService.getMyRequests();
    } catch (loadError) {
      if (disposed || background) return;
      if (requestsById.size === 0) {
        error.textContent = loadError.message || 'Unable to load your requests. Please try again.';
        error.hidden = false;
        retry.hidden = false;
        content.hidden = true;
      }
      if (!disposed && !background) loading.hidden = true;
      return;
    }
    if (disposed) return;
    allRequests = Array.isArray(data) ? data : [];
    applyStatusFilter();
    error.hidden = true;
    retry.hidden = true;
    content.hidden = false;
    if (!disposed && !background) loading.hidden = true;
  }

  function openDetails(request) {
    activeRequestId = String(request.id);
    root.querySelector('#request-dialog-mentee').textContent = request.menteeName || 'Mentee unavailable';
    root.querySelector('#request-dialog-package').textContent = request.packageName || 'Offering unavailable';
    root.querySelector('#request-dialog-type').textContent = requestTypeLabel(request.serviceType);
    root.querySelector('#request-dialog-goals').textContent = request.learningGoals || 'No goals provided.';
    root.querySelector('#request-dialog-status').textContent = REQUEST_STATUS_LABELS[request.status] || request.status || 'Unknown';
    root.querySelector('#request-dialog-submitted').textContent = formatUtcDate(request.submittedAt);
    root.querySelector('#request-dialog-deadline').textContent = formatUtcDate(request.responseDeadline);
    const actionable = isActionable(request);
    rejectButton.hidden = !actionable;
    acceptButton.hidden = !actionable;
    setDialogButtonsEnabled(actionable);
    dialogOverlay.classList.remove('hidden');
    dialogOverlay.classList.add('flex');
    dialog.focus?.();
  }

  async function decide(decision) {
    if (!activeRequestId || busy) return;
    const requestId = activeRequestId;
    busy = true;
    setDialogButtonsEnabled(false);
    try {
      await mentorDashboardService.decideOnRequest(requestId, decision);
    } catch (decisionError) {
      setActionStatus(decisionError.message || 'The decision could not be saved. Please try again.', 'error');
      const request = requestsById.get(String(requestId));
      setDialogButtonsEnabled(isActionable(request));
      busy = false;
      return;
    }
    const decided = requestsById.get(String(requestId));
    const oneOff = decided?.serviceType === 'ONE_OFF';
    closeDialog();
    if (decision === 'ACCEPTED') {
      setActionStatus(oneOff
        ? 'Session request accepted. The mentee has been notified to arrange the session.'
        : 'Request accepted. The mentee can now continue to payment.');
    } else {
      setActionStatus(oneOff
        ? 'Session request declined. It remains available in your request history.'
        : 'Request declined. It remains available in your request history.');
    }
    await loadRequests({ background: true });
    busy = false;
  }

  async function handleAccept() {
    await decide('ACCEPTED');
  }

  async function handleReject() {
    await decide('REJECTED');
  }

  const handleClick = event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-close-dialog]')) {
      closeDialog();
      return;
    }
    const detailsButton = target.closest('[data-details-id]');
    if (detailsButton) {
      const request = requestsById.get(detailsButton.dataset.detailsId);
      if (request) openDetails(request);
      return;
    }
    const dialogAction = target.closest('[data-dialog-action]');
    if (dialogAction) {
      if (dialogAction.dataset.dialogAction === 'ACCEPTED') void handleAccept();
      else if (dialogAction.dataset.dialogAction === 'REJECTED') void handleReject();
    }
  };

  const handleDialogClick = event => {
    if (event.target === dialogOverlay) closeDialog();
  };

  const handleKeydown = event => {
    if (event.key === 'Escape' && !dialogOverlay.classList.contains('hidden')) {
      closeDialog();
    }
  };

  retry.addEventListener('click', () => {
    actionStatus.hidden = true;
    void loadRequests();
  });
  statusFilter.addEventListener('change', applyStatusFilter);
  root.addEventListener('click', handleClick);
  dialogOverlay.addEventListener('click', handleDialogClick);
  window.addEventListener('keydown', handleKeydown);

  const timer = window.setInterval(updateSlaTimers, 60_000);
  void loadRequests();

  return () => {
    disposed = true;
    window.clearInterval(timer);
    window.clearTimeout(actionStatusTimer);
    window.removeEventListener('keydown', handleKeydown);
    root.removeEventListener('click', handleClick);
    dialogOverlay.removeEventListener('click', handleDialogClick);
  };
}
