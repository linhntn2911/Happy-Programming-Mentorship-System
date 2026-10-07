import { DashboardMetricCard } from '../components/mentor/DashboardMetricCard.js';
import { mentorDashboardService } from '../services/mentorDashboardService.js';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 2,
});

export function formatVnd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new TypeError('Dashboard earnings must be a finite number.');
  }
  return currencyFormatter.format(amount);
}

export function formatSlaRemaining(deadline, now = Date.now()) {
  const deadlineTime = Date.parse(deadline);
  if (!Number.isFinite(deadlineTime)) {
    return 'Deadline unavailable';
  }
  const remainingMinutes = Math.ceil((deadlineTime - now) / 60_000);
  if (remainingMinutes <= 0) {
    return 'Expired';
  }
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return `${hours}h ${minutes}m remaining`;
}

export function summarizeLearningGoals(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'No goals provided.';
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= 140) {
    return normalized;
  }
  return `${normalized.slice(0, 139).trimEnd()}…`;
}

export function MentorDashboardPage() {
  return `
<main id="mentor-dashboard" class="container max-w-7xl py-8 sm:py-12">
  <nav class="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Mentor navigation">
    <a href="#/" class="font-medium text-brand underline-offset-4 hover:underline">← Home</a>
    <a href="#/mentor/profile" class="font-medium text-brand underline-offset-4 hover:underline">Edit profile</a>
  </nav>
  <header class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="eyebrow">MENTOR SPACE</p>
      <h1 class="section-title mt-2">Mentor dashboard</h1>
      <p class="section-copy mt-3">Review your earnings, incoming requests, and mentorship updates.</p>
    </div>
    <a href="#/mentor/profile" class="btn btn-outline self-start sm:self-auto">Edit mentor profile</a>
  </header>

  <div id="dashboard-demo-notice" class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status" hidden>
    Development preview: sample dashboard data is read-only and request decisions are disabled.
  </div>
  <div id="dashboard-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your dashboard…
  </div>
  <div id="dashboard-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="dashboard-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
  <p id="dashboard-action-status" class="mb-5 text-sm font-medium text-brand" role="status" aria-live="polite"></p>

  <div id="dashboard-content" class="space-y-9" hidden>
    <section aria-labelledby="dashboard-summary-title">
      <h2 id="dashboard-summary-title" class="sr-only">Summary</h2>
      <div id="dashboard-metrics" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"></div>
    </section>

    <section aria-labelledby="dashboard-requests-title">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">NEEDS YOUR ATTENTION</p>
          <h2 id="dashboard-requests-title" class="mt-2 text-xl font-semibold text-ink">Incoming mentorship requests</h2>
        </div>
        <p class="text-sm text-muted">Respond within 48 hours.</p>
      </div>
      <div id="dashboard-requests-empty" class="rounded-2xl border border-line bg-white p-6 text-sm text-muted" hidden>
        No pending mentorship requests right now.
      </div>
      <div class="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
        <table class="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead class="bg-lilac/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" class="px-4 py-3">Mentee Name</th>
              <th scope="col" class="px-4 py-3">Package</th>
              <th scope="col" class="px-4 py-3">Learning Goals Summary</th>
              <th scope="col" class="px-4 py-3">SLA Timer</th>
              <th scope="col" class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody id="dashboard-request-rows" class="divide-y divide-line"></tbody>
        </table>
      </div>
      <div id="dashboard-request-cards" class="grid gap-3 md:hidden"></div>
    </section>

    <section aria-labelledby="dashboard-notices-title">
      <div class="mb-4">
        <p class="eyebrow">SYSTEM UPDATES</p>
        <h2 id="dashboard-notices-title" class="mt-2 text-xl font-semibold text-ink">Cancellations and refunds</h2>
      </div>
      <div id="dashboard-notices-empty" class="rounded-2xl border border-line bg-white p-6 text-sm text-muted" hidden>
        No recent cancellation or refund updates.
      </div>
      <ul id="dashboard-notices" class="space-y-3"></ul>
    </section>
  </div>

  <dialog id="dashboard-request-dialog" class="w-[min(92vw,38rem)] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40" aria-labelledby="dashboard-dialog-title">
    <div class="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
      <div>
        <p class="eyebrow">REQUEST DETAILS</p>
        <h2 id="dashboard-dialog-title" class="mt-2 text-xl font-semibold">Mentorship request</h2>
      </div>
      <button type="button" data-close-dialog class="btn btn-outline btn-sm" aria-label="Close request details">Close</button>
    </div>
    <dl class="grid gap-4 p-5 sm:p-6">
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Mentee</dt><dd id="dashboard-dialog-mentee" class="mt-1 break-words text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Package</dt><dd id="dashboard-dialog-package" class="mt-1 break-words text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Learning goals</dt><dd id="dashboard-dialog-goals" class="mt-1 whitespace-pre-wrap break-words text-sm leading-6"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Submitted (UTC)</dt><dd id="dashboard-dialog-submitted" class="mt-1 text-sm"></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Response deadline (UTC)</dt><dd id="dashboard-dialog-deadline" class="mt-1 text-sm"></dd></div>
    </dl>
  </dialog>
</main>`;
}

function createActionButton(label, action, requestId, variant, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn ${variant} btn-sm !px-3`;
  button.textContent = label;
  button.dataset.dashboardAction = action;
  button.dataset.requestId = String(requestId);
  button.disabled = disabled;
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

function formatUtcDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : `${date.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`;
}

function renderRequestRows(container, requests) {
  const rows = document.querySelector('#dashboard-request-rows');
  const cards = document.querySelector('#dashboard-request-cards');
  const empty = document.querySelector('#dashboard-requests-empty');
  const table = rows.closest('table').parentElement;
  rows.replaceChildren();
  cards.replaceChildren();
  empty.hidden = requests.length > 0;
  table.hidden = requests.length === 0;

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
    const actionGroup = document.createElement('div');
    actionGroup.className = 'flex flex-wrap gap-2';
    actionGroup.append(
      createActionButton('Details', 'details', request.id, 'btn-outline'),
      createActionButton('Accept', 'ACCEPTED', request.id, 'btn-primary'),
      createActionButton('Reject', 'REJECTED', request.id, 'btn-danger')
    );
    actionCell.append(actionGroup);
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
    const actionGroupMobile = document.createElement('div');
    actionGroupMobile.className = 'mt-4 flex flex-wrap gap-2';
    actionGroupMobile.append(
      createActionButton('Details', 'details', request.id, 'btn-outline'),
      createActionButton('Accept', 'ACCEPTED', request.id, 'btn-primary'),
      createActionButton('Reject', 'REJECTED', request.id, 'btn-danger')
    );
    card.append(heading, goalsLabel, goals, sla, actionGroupMobile);
    cards.append(card);
  }

  container.dataset.requestCount = String(requests.length);
}

function renderNotices(notices) {
  const list = document.querySelector('#dashboard-notices');
  const empty = document.querySelector('#dashboard-notices-empty');
  list.replaceChildren();
  empty.hidden = notices.length > 0;

  for (const notice of notices) {
    const item = document.createElement('li');
    item.className = 'rounded-2xl border border-line bg-white p-4 sm:p-5';
    const header = document.createElement('div');
    header.className = 'flex flex-wrap items-center justify-between gap-2';
    const title = document.createElement('p');
    title.className = 'font-semibold text-ink';
    title.textContent = notice.type === 'REFUND' ? 'Refund update' : 'Cancellation update';
    const badge = document.createElement('span');
    badge.className = 'rounded-full bg-lilac px-2.5 py-1 text-xs font-semibold text-brand';
    badge.textContent = notice.status || 'Status unavailable';
    const message = document.createElement('p');
    message.className = 'mt-2 break-words text-sm leading-6 text-muted';
    message.textContent = notice.message || 'A mentorship record has been updated.';
    const context = document.createElement('p');
    context.className = 'mt-2 text-xs text-muted';
    const name = notice.menteeName || 'Mentee unavailable';
    context.textContent = `${name} · ${formatUtcDate(notice.occurredAt)}`;
    header.append(title, badge);
    item.append(header, message, context);
    if (notice.completedAt) {
      const completed = document.createElement('p');
      completed.className = 'mt-1 text-xs text-muted';
      completed.textContent = `Refund completed: ${formatUtcDate(notice.completedAt)}`;
      item.append(completed);
    }
    list.append(item);
  }
}

function renderDashboardMetrics(summary) {
  if (!Number.isFinite(Number(summary.pendingInvitations))
      || !Number.isFinite(Number(summary.reviewCount))) {
    throw new TypeError('Dashboard summary counts are invalid.');
  }
  const ratingValue = summary.averageRating == null
    ? 'No published reviews'
    : `${Number(summary.averageRating).toFixed(2)} / 5`;
  if (summary.averageRating != null && !Number.isFinite(Number(summary.averageRating))) {
    throw new TypeError('Dashboard average rating is invalid.');
  }
  const cards = [
    DashboardMetricCard({
      label: 'Net earnings',
      value: formatVnd(summary.netEarnings),
      description: 'Lifetime after successful refunds and payment commission.',
      icon: '₫',
    }),
    DashboardMetricCard({
      label: 'Pending invitations',
      value: String(Number(summary.pendingInvitations)),
      description: 'Requests waiting for a decision within the 48-hour SLA.',
      icon: '⌛',
    }),
    DashboardMetricCard({
      label: 'Average rating',
      value: ratingValue,
      description: `${Number(summary.reviewCount)} published review${Number(summary.reviewCount) === 1 ? '' : 's'}.`,
      icon: '★',
    }),
  ];
  document.querySelector('#dashboard-metrics').innerHTML = cards.join('');
}

function validateDashboard(data) {
  if (!data || !data.summary || !Array.isArray(data.incomingRequests)
      || !Array.isArray(data.systemNotices)) {
    throw new TypeError('The dashboard response is incomplete. Please retry.');
  }
}

export function initializeMentorDashboardPage() {
  const root = document.querySelector('#mentor-dashboard');
  if (!root) return () => {};

  const loading = document.querySelector('#dashboard-loading');
  const content = document.querySelector('#dashboard-content');
  const error = document.querySelector('#dashboard-error');
  const retry = document.querySelector('#dashboard-retry');
  const actionStatus = document.querySelector('#dashboard-action-status');
  const dialog = document.querySelector('#dashboard-request-dialog');
  const demoNotice = document.querySelector('#dashboard-demo-notice');
  const requestsById = new Map();
  const busyRequestIds = new Set();
  let disposed = false;
  let usingDemoData = false;

  function updateSlaTimers() {
    for (const timer of root.querySelectorAll('[data-sla-id]')) {
      const requestId = timer.dataset.slaId;
      const deadline = timer.dataset.deadline;
      timer.textContent = formatSlaRemaining(deadline);
      const deadlineTime = Date.parse(deadline);
      const disabled = !Number.isFinite(deadlineTime)
        || deadlineTime <= Date.now()
        || usingDemoData
        || busyRequestIds.has(requestId);
      for (const button of root.querySelectorAll('[data-dashboard-action]')) {
        if (button.dataset.requestId === requestId && button.dataset.dashboardAction !== 'details') {
          button.disabled = disabled;
        }
      }
    }
  }

  async function loadDashboard({ background = false } = {}) {
    if (!background) {
      loading.hidden = false;
      content.hidden = true;
      retry.hidden = true;
      error.hidden = true;
    }
    try {
      const dashboardResult = await mentorDashboardService.getMyDashboard();
      const data = dashboardResult.data;
      usingDemoData = dashboardResult.isMock;
      validateDashboard(data);
      if (disposed) return;
      demoNotice.hidden = !usingDemoData;
      requestsById.clear();
      for (const request of data.incomingRequests) {
        requestsById.set(String(request.id), request);
      }
      renderDashboardMetrics(data.summary);
      renderRequestRows(root, data.incomingRequests);
      renderNotices(data.systemNotices);
      error.hidden = true;
      retry.hidden = true;
      content.hidden = false;
      updateSlaTimers();
    } catch (loadError) {
      if (disposed) return;
      loading.hidden = true;
      error.textContent = background
        ? `${actionStatus.textContent || 'The request was updated.'} The dashboard could not refresh. Please retry.`
        : loadError.message || 'Unable to load your dashboard. Please try again.';
      error.hidden = false;
      retry.hidden = false;
      if (!background) content.hidden = true;
    } finally {
      if (!disposed && !background) loading.hidden = true;
    }
  }

  function openDetails(request) {
    document.querySelector('#dashboard-dialog-mentee').textContent =
      request.menteeName || 'Mentee unavailable';
    document.querySelector('#dashboard-dialog-package').textContent =
      request.packageName || 'Offering unavailable';
    document.querySelector('#dashboard-dialog-goals').textContent =
      request.learningGoals || 'No goals provided.';
    document.querySelector('#dashboard-dialog-submitted').textContent =
      formatUtcDate(request.submittedAt);
    document.querySelector('#dashboard-dialog-deadline').textContent =
      formatUtcDate(request.responseDeadline);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  retry.addEventListener('click', () => {
    actionStatus.textContent = '';
    void loadDashboard();
  });

  const handleActionClick = async event => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-dashboard-action], [data-close-dialog]')
      : null;
    if (!target) return;
    if (target.hasAttribute('data-close-dialog')) {
      dialog.close();
      return;
    }

    const requestId = target.dataset.requestId;
    const action = target.dataset.dashboardAction;
    const request = requestsById.get(requestId);
    if (!request) return;
    if (action === 'details') {
      openDetails(request);
      return;
    }
    if (usingDemoData
        || (action !== 'ACCEPTED' && action !== 'REJECTED')
        || busyRequestIds.has(requestId)) return;

    busyRequestIds.add(requestId);
    updateSlaTimers();
    actionStatus.textContent = 'Saving your decision…';
    try {
      const result = await mentorDashboardService.decideOnRequest(requestId, action);
      actionStatus.textContent = result.status === 'ACCEPTED'
        ? 'Request accepted. The mentee can continue to checkout.'
        : 'Request rejected.';
      await loadDashboard({ background: true });
    } catch (decisionError) {
      actionStatus.textContent = '';
      error.textContent = decisionError.message || 'Unable to save your decision. Please try again.';
      error.hidden = false;
      retry.hidden = false;
    } finally {
      busyRequestIds.delete(requestId);
      updateSlaTimers();
    }
  };
  root.addEventListener('click', handleActionClick);

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  const timer = window.setInterval(updateSlaTimers, 60_000);
  void loadDashboard();

  return () => {
    disposed = true;
    window.clearInterval(timer);
    root.removeEventListener('click', handleActionClick);
  };
}
