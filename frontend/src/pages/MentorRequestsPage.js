import { mentorDashboardService } from '../services/mentorDashboardService.js';
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
    <p class="eyebrow">NEEDS YOUR ATTENTION</p>
    <h1 class="section-title mt-2">Incoming mentorship requests</h1>
    <p class="section-copy mt-3">Open a request to review the details, then accept or reject it. Respond within 48 hours.</p>
  </header>

  <div id="requests-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your requests…
  </div>
  <div id="requests-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="requests-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
  <p id="requests-action-status" class="mb-5 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

  <div id="requests-content" hidden>
    <div id="requests-empty" class="rounded-2xl border border-line bg-white p-6 text-sm text-muted" hidden>
      No pending mentorship requests right now.
    </div>
    <div id="requests-table-wrap" class="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
      <table class="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead class="bg-lilac/60 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" class="px-4 py-3">Mentee Name</th>
            <th scope="col" class="px-4 py-3">Package</th>
            <th scope="col" class="px-4 py-3">Learning Goals Summary</th>
            <th scope="col" class="px-4 py-3">SLA Timer</th>
            <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody id="requests-rows" class="divide-y divide-line"></tbody>
      </table>
    </div>
    <div id="requests-cards" class="grid gap-3 md:hidden"></div>
  </div>

  <dialog id="request-dialog" class="w-[min(92vw,38rem)] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40" aria-labelledby="request-dialog-title">
    <div class="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
      <div>
        <p class="eyebrow">REQUEST DETAILS</p>
        <h2 id="request-dialog-title" class="mt-2 text-xl font-semibold">Mentorship request</h2>
      </div>
      <button type="button" data-close-dialog class="btn btn-outline btn-sm" aria-label="Close request details">Close</button>
    </div>
    <dl class="grid gap-4 p-5 sm:p-6">
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Mentee</dt><dd id="request-dialog-mentee" class="mt-1 break-words text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Package</dt><dd id="request-dialog-package" class="mt-1 break-words text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Learning goals</dt><dd id="request-dialog-goals" class="mt-1 whitespace-pre-wrap break-words text-sm leading-6"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Submitted (UTC)</dt><dd id="request-dialog-submitted" class="mt-1 text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Response deadline (UTC)</dt><dd id="request-dialog-deadline" class="mt-1 text-sm"></dd></div>
    </dl>
    <div class="flex flex-col-reverse gap-3 border-t border-line p-5 sm:flex-row sm:justify-end sm:p-6">
      <button type="button" id="request-dialog-reject" data-dialog-action="REJECTED" class="btn btn-danger">Reject</button>
      <button type="button" id="request-dialog-accept" data-dialog-action="ACCEPTED" class="btn btn-primary">Accept</button>
    </div>
  </dialog>
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
    for (const value of cells) {
      const cell = document.createElement('td');
      cell.className = 'px-4 py-4 align-top text-sm text-ink';
      cell.textContent = value;
      row.append(cell);
    }
    const slaCell = document.createElement('td');
    slaCell.className = 'px-4 py-4 align-top';
    slaCell.append(createSlaElement(request));
    row.append(slaCell);

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
    heading.append(name, packageName);
    const goalsLabel = document.createElement('p');
    goalsLabel.className = 'mt-4 text-xs font-semibold uppercase tracking-wide text-muted';
    goalsLabel.textContent = 'Learning goals';
    const goals = document.createElement('p');
    goals.className = 'mt-1 text-sm leading-6 text-ink';
    goals.textContent = summarizeLearningGoals(request.learningGoalsSummary || request.learningGoals);
    const sla = document.createElement('p');
    sla.className = 'mt-3 flex flex-wrap items-center gap-2 text-xs text-muted';
    sla.append('SLA: ', createSlaElement(request));
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
  if (!root) return () => {};

  const loading = root.querySelector('#requests-loading');
  const content = root.querySelector('#requests-content');
  const error = root.querySelector('#requests-error');
  const retry = root.querySelector('#requests-retry');
  const actionStatus = root.querySelector('#requests-action-status');
  const dialog = root.querySelector('#request-dialog');
  const acceptButton = root.querySelector('#request-dialog-accept');
  const rejectButton = root.querySelector('#request-dialog-reject');

  const requestsById = new Map();
  let activeRequestId = null;
  let busy = false;
  let disposed = false;

  function setDialogButtonsEnabled(enabled) {
    acceptButton.disabled = !enabled;
    rejectButton.disabled = !enabled;
  }

  function isActionable(request) {
    const deadline = Date.parse(request?.responseDeadline);
    return Number.isFinite(deadline) && deadline > Date.now();
  }

  function updateSlaTimers() {
    for (const timer of root.querySelectorAll('[data-sla-id]')) {
      timer.textContent = formatSlaRemaining(timer.dataset.deadline);
    }
  }

  async function loadRequests({ background = false } = {}) {
    if (!background) {
      loading.hidden = false;
      content.hidden = true;
      retry.hidden = true;
      error.hidden = true;
    }
    try {
      const data = await mentorDashboardService.getMyDashboard();
      if (!data || !Array.isArray(data.incomingRequests)) {
        throw new TypeError('The requests response is incomplete. Please retry.');
      }
      if (disposed) return;
      requestsById.clear();
      for (const request of data.incomingRequests) {
        requestsById.set(String(request.id), request);
      }
      renderRows(root, data.incomingRequests);
      error.hidden = true;
      retry.hidden = true;
      content.hidden = false;
      updateSlaTimers();
    } catch (loadError) {
      if (disposed) return;
      error.textContent = loadError.message || 'Unable to load your requests. Please try again.';
      error.hidden = false;
      retry.hidden = false;
      if (!background) content.hidden = true;
    } finally {
      if (!disposed && !background) loading.hidden = true;
    }
  }

  function openDetails(request) {
    activeRequestId = String(request.id);
    root.querySelector('#request-dialog-mentee').textContent = request.menteeName || 'Mentee unavailable';
    root.querySelector('#request-dialog-package').textContent = request.packageName || 'Offering unavailable';
    root.querySelector('#request-dialog-goals').textContent = request.learningGoals || 'No goals provided.';
    root.querySelector('#request-dialog-submitted').textContent = formatUtcDate(request.submittedAt);
    root.querySelector('#request-dialog-deadline').textContent = formatUtcDate(request.responseDeadline);
    setDialogButtonsEnabled(isActionable(request));
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  async function decide(decision) {
    if (!activeRequestId || busy) return;
    busy = true;
    setDialogButtonsEnabled(false);
    actionStatus.textContent = 'Saving your decision…';
    try {
      const result = await mentorDashboardService.decideOnRequest(activeRequestId, decision);
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      activeRequestId = null;
      actionStatus.textContent = result.status === 'ACCEPTED'
        ? 'Request accepted. The mentee has been notified and can continue to checkout.'
        : 'Request rejected. The mentee has been notified.';
      await loadRequests({ background: true });
    } catch (decisionError) {
      actionStatus.textContent = '';
      error.textContent = decisionError.message || 'Unable to save your decision. Please try again.';
      error.hidden = false;
      retry.hidden = false;
      const request = requestsById.get(activeRequestId);
      setDialogButtonsEnabled(isActionable(request));
    } finally {
      busy = false;
    }
  }

  const handleClick = event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-close-dialog]')) {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      activeRequestId = null;
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
      void decide(dialogAction.dataset.dialogAction);
    }
  };

  const handleDialogClick = event => {
    if (event.target === dialog) {
      if (typeof dialog.close === 'function') dialog.close();
      activeRequestId = null;
    }
  };

  retry.addEventListener('click', () => {
    actionStatus.textContent = '';
    void loadRequests();
  });
  root.addEventListener('click', handleClick);
  dialog.addEventListener('click', handleDialogClick);

  const timer = window.setInterval(updateSlaTimers, 60_000);
  void loadRequests();

  return () => {
    disposed = true;
    window.clearInterval(timer);
    root.removeEventListener('click', handleClick);
    dialog.removeEventListener('click', handleDialogClick);
  };
}
