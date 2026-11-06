import { mentorDashboardService } from './mentorDashboardService.js';
import {
  formatSlaRemaining,
  formatUtcDate,
  summarizeLearningGoals,
} from './MentorDashboardPage.js';
import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export function MentorRequestsPage() {
  return MentorLayout(`
<section id="mentor-requests" aria-labelledby="mentor-requests-title">
  <div class="admin-page-heading">
    <div>
      <p class="eyebrow mb-3">MENTOR WORKSPACE</p>
      <h1 id="mentor-requests-title">Bookings</h1>
      <p>Manage monthly mentorship applications and confirmed one-off sessions in one place.</p>
    </div>
  </div>

  <div id="action-status" class="admin-notice mb-5 hidden" role="status" aria-live="polite"></div>

  <div id="requests-loading" class="admin-panel admin-panel-body text-sm text-muted" role="status">
    Loading your bookings…
  </div>
  <div id="requests-error" class="admin-notice notice-error mb-5" role="alert" hidden></div>
  <button id="requests-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>

  <div id="requests-content" class="admin-panel" hidden>
    <div class="admin-toolbar flex-wrap items-end gap-3 justify-between">
      <div class="flex flex-wrap items-end gap-3 grow">
        <label for="request-search-input" class="admin-field admin-search">Search bookings
          <input type="search" id="request-search-input" placeholder="Search by mentee name, package or goals..." maxlength="100">
        </label>
        <label for="request-status-filter" class="admin-field min-w-44">Status
          <select id="request-status-filter">
            <option value="ALL">All statuses</option>
            <option value="WAITING_DECISION">Waiting for my decision</option>
            <option value="AWAITING_PAYMENT">Awaiting payment</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Declined</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </label>
        <label for="request-type-filter" class="admin-field min-w-36">Type
          <select id="request-type-filter">
            <option value="ALL">All types</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ONE_OFF">One-off session</option>
          </select>
        </label>
      </div>
      <p id="requests-count" class="text-xs text-muted self-center" aria-live="polite"></p>
    </div>
    <div id="requests-empty" class="admin-panel-body text-sm text-muted" hidden>
      No bookings match these filters.
    </div>
    <div id="requests-table-wrap" class="data-table-scroll hidden md:block">
      <table class="data-table min-w-[860px]">
        <thead>
          <tr>
            <th scope="col" class="px-4 py-3">Mentee Name</th>
            <th scope="col" class="px-4 py-3">Package / session</th>
            <th scope="col" class="px-4 py-3">Agenda / learning goals</th>
            <th scope="col" class="px-4 py-3">Status</th>
            <th scope="col" class="px-4 py-3">Schedule / deadline</th>
            <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody id="requests-rows" class="divide-y divide-line"></tbody>
      </table>
    </div>
    <div id="requests-cards" class="grid gap-3 p-4 md:hidden"></div>
  </div>

  <div id="request-dialog-overlay" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
    <div id="request-dialog" class="relative mx-auto my-auto w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="request-dialog-title" tabindex="-1">
      <div class="flex items-start justify-between gap-4 p-6 pb-5">
        <div><p class="eyebrow">BOOKING DETAILS</p><h2 id="request-dialog-title" class="mt-2 font-display text-3xl text-ink">Booking information</h2><p class="mt-1 text-sm text-muted">Review the saved application or scheduled one-off session.</p></div>
        <button type="button" data-close-dialog class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-lilac text-xl text-muted hover:text-ink" aria-label="Close request details">×</button>
      </div>
      <div class="mx-6 border-t border-line"></div>
      <dl class="grid gap-4 p-6 sm:grid-cols-2">
        <div><dt class="text-sm font-semibold text-ink">Mentee</dt><dd id="request-dialog-mentee" class="mt-1 break-words text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Package</dt><dd id="request-dialog-package" class="mt-1 break-words text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Booking type</dt><dd id="request-dialog-type" class="mt-1 text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Current status</dt><dd id="request-dialog-status" class="mt-1 text-sm text-muted"></dd></div>
        <div><dt class="text-sm font-semibold text-ink">Submitted</dt><dd id="request-dialog-submitted" class="mt-1 text-sm text-muted"></dd></div>
        <div class="sm:col-span-2"><dt class="text-sm font-semibold text-ink">Agenda / learning goals</dt><dd id="request-dialog-goals" class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted"></dd></div>
        <div><dt id="request-dialog-date-label" class="text-sm font-semibold text-ink">Schedule / deadline</dt><dd id="request-dialog-deadline" class="mt-1 text-sm text-muted"></dd></div>
        <div id="request-dialog-attendees-wrap"><dt class="text-sm font-semibold text-ink">Sessions and participants</dt><dd id="request-dialog-attendees" class="mt-1 text-sm text-muted"></dd></div>
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
</section>`, authService.getCurrentUser(), 'bookings');
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
  WAITING_DECISION: 'Waiting for mentor decision',
  AWAITING_PAYMENT: 'Awaiting payment',
  UPCOMING: 'Upcoming',
  ACTIVE: 'Active',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
const REQUEST_STATUS_STYLES = {
  PENDING: 'status-warning',
  WAITING_DECISION: 'status-warning',
  AWAITING_PAYMENT: 'status-warning',
  UPCOMING: 'status-success',
  ACTIVE: 'status-success',
  CONFIRMED: 'status-success',
  COMPLETED: 'status-success',
  NO_SHOW: 'status-danger',
  ACCEPTED: 'status-success',
  REJECTED: 'status-danger',
  EXPIRED: 'status-neutral',
  CANCELLED: 'status-neutral',
};

function createStatusElement(request) {
  const status = request.lifecycleStatus || request.status || 'UNKNOWN';
  const badge = document.createElement('span');
  badge.className = `status-badge ${REQUEST_STATUS_STYLES[status] || REQUEST_STATUS_STYLES.EXPIRED}`;
  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  dot.textContent = '●';
  badge.append(dot, REQUEST_STATUS_LABELS[status] || status);
  return badge;
}

function formatSchedule(request) {
  if (request.serviceType !== 'ONE_OFF' || !request.startAt) return '—';
  const start = formatUtcDate(request.startAt);
  const end = request.endAt ? formatUtcDate(request.endAt) : '';
  return end && end !== '—' ? start + ' – ' + end : start;
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
      cell.className = index === 2
        ? 'max-w-[420px] whitespace-normal align-top leading-5 text-ink'
        : 'align-top text-ink';
      cell.textContent = value;
      if (index === 1) cell.append(createTypeBadge(request.serviceType));
      row.append(cell);
    }
    const statusCell = document.createElement('td');
    statusCell.className = 'align-top';
    statusCell.append(createStatusElement(request));
    row.append(statusCell);

    const deadlineCell = document.createElement('td');
    deadlineCell.className = 'whitespace-normal align-top text-muted';
    if (request.serviceType === 'MONTHLY' && request.status === 'PENDING') deadlineCell.append(createSlaElement(request));
    else deadlineCell.textContent = formatSchedule(request);
    row.append(deadlineCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'align-top';
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
    goalsLabel.textContent = request.serviceType === 'ONE_OFF' ? 'Agenda' : 'Learning goals';
    const goals = document.createElement('p');
    goals.className = 'mt-1 text-sm leading-6 text-ink';
    goals.textContent = summarizeLearningGoals(request.learningGoalsSummary || request.learningGoals);
    const sla = document.createElement('p');
    sla.className = 'mt-3 flex flex-wrap items-center gap-2 text-xs text-muted';
    if (request.serviceType === 'MONTHLY' && request.status === 'PENDING') {
      sla.append('Response due: ', createSlaElement(request));
    } else {
      sla.append(request.serviceType === 'ONE_OFF' ? 'Schedule: ' + formatSchedule(request) : 'Schedule: —');
    }
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
  const unbindLayout = bindMentorLayout(root.closest('.admin-shell'));

  const loading = root.querySelector('#requests-loading');
  const content = root.querySelector('#requests-content');
  const error = root.querySelector('#requests-error');
  const retry = root.querySelector('#requests-retry');
  const actionStatus = root.querySelector('#action-status');
  const searchInput = root.querySelector('#request-search-input');
  const statusFilter = root.querySelector('#request-status-filter');
  const typeFilter = root.querySelector('#request-type-filter');
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
    return request?.serviceType === 'MONTHLY'
      && request?.status === 'PENDING'
      && Number.isFinite(deadline)
      && deadline > Date.now();
  }

  function updateSlaTimers() {
    for (const timer of root.querySelectorAll('[data-sla-id]')) {
      timer.textContent = formatSlaRemaining(timer.dataset.deadline);
    }
  }

  function setActionStatus(message, type = 'success') {
    if (!actionStatus) return;
    actionStatus.textContent = message;
    actionStatus.className = type === 'success'
      ? 'admin-notice mb-5'
      : 'admin-notice notice-error mb-5';
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
    requestCount.textContent = `${requests.length} booking${requests.length === 1 ? '' : 's'}`;
    empty.textContent = (statusFilter.value === "ALL" && (!searchInput || !searchInput.value.trim()))
      ? "No bookings have been created yet."
      : "No bookings match these filters.";
    updateSlaTimers();
  }

  function applyStatusFilter() {
    const query = normalize(searchInput?.value || "");
    const requests = allRequests.filter(request => {
      const status = request.lifecycleStatus || request.status;
      const statusMatch = statusFilter.value === "ALL" || status === statusFilter.value;
      const typeMatch = typeFilter.value === "ALL" || request.serviceType === typeFilter.value;
      if (!statusMatch || !typeMatch) return false;
      if (!query) return true;
      const text = normalize([
        request.menteeName,
        request.menteeEmail,
        request.packageName,
        request.learningGoals,
        request.learningGoalsSummary,
        "#" + request.id,
        request.id
      ].join(" "));
      return text.includes(query);
    });
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
      data = await mentorDashboardService.getMyBookings();
    } catch (loadError) {
      if (disposed || background) return;
      if (requestsById.size === 0) {
        error.textContent = loadError.message || 'Unable to load your bookings. Please try again.';
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
    const lifecycleStatus = request.lifecycleStatus || request.status;
    root.querySelector('#request-dialog-status').textContent = REQUEST_STATUS_LABELS[lifecycleStatus] || lifecycleStatus || 'Unknown';
    root.querySelector('#request-dialog-submitted').textContent = formatUtcDate(request.submittedAt);
    const oneOff = request.serviceType === 'ONE_OFF';
    root.querySelector('#request-dialog-date-label').textContent = oneOff ? 'Session schedule' : 'Response deadline';
    root.querySelector('#request-dialog-deadline').textContent = oneOff
      ? formatSchedule(request)
      : request.responseDeadline ? formatUtcDate(request.responseDeadline) : '—';
    root.querySelector('#request-dialog-attendees-wrap').hidden = !oneOff;
    const sessionCount = request.numberOfSessions || 1;
    const participantCount = request.numberOfParticipants || 1;
    root.querySelector('#request-dialog-attendees').textContent = oneOff
      ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} · ${participantCount} participant${participantCount === 1 ? '' : 's'}`
      : '';
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

  const handleRetry = () => {
    actionStatus.hidden = true;
    void loadRequests();
  };
  retry.addEventListener('click', handleRetry);
  searchInput?.addEventListener('input', applyStatusFilter);
  statusFilter.addEventListener('change', applyStatusFilter);
  typeFilter.addEventListener('change', applyStatusFilter);
  root.addEventListener('click', handleClick);
  dialogOverlay.addEventListener('click', handleDialogClick);
  window.addEventListener('keydown', handleKeydown);

  const timer = window.setInterval(updateSlaTimers, 60_000);
  void loadRequests();

  return () => {
    disposed = true;
    unbindLayout();
    window.clearInterval(timer);
    window.clearTimeout(actionStatusTimer);
    window.removeEventListener('keydown', handleKeydown);
    retry.removeEventListener('click', handleRetry);
    searchInput?.removeEventListener('input', applyStatusFilter);
    statusFilter.removeEventListener('change', applyStatusFilter);
    typeFilter.removeEventListener('change', applyStatusFilter);
    root.removeEventListener('click', handleClick);
    dialogOverlay.removeEventListener('click', handleDialogClick);
  };
}
