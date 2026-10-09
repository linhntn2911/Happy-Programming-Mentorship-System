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

export function formatUtcDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : `${date.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`;
}

export function MentorDashboardPage() {
  return `
<main id="mentor-dashboard" class="container max-w-7xl py-8 sm:py-12">
  <nav class="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Mentor navigation">
    <a href="#/" class="font-medium text-brand underline-offset-4 hover:underline">← Home</a>
    <a href="#/mentor/requests" class="font-medium text-brand underline-offset-4 hover:underline">Requests</a>
    <a href="#/mentor/profile" class="font-medium text-brand underline-offset-4 hover:underline">Edit profile</a>
    <a href="#/mentor/availability" class="font-medium text-brand underline-offset-4 hover:underline">Availability</a>
    <a href="#/mentor/packages" class="font-medium text-brand underline-offset-4 hover:underline">Packages</a>
  </nav>
  <header class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="eyebrow">MENTOR SPACE</p>
      <h1 class="section-title mt-2">Mentor dashboard</h1>
      <p class="section-copy mt-3">Review your earnings and mentorship updates.</p>
    </div>
    <div class="flex flex-wrap gap-3 self-start sm:self-auto">
      <a href="#/mentor/requests" class="btn btn-primary">View requests</a>
      <a href="#/mentor/profile" class="btn btn-outline">Edit mentor profile</a>
    </div>
  </header>

  <div id="dashboard-loading" class="rounded-xl border border-line bg-white p-6 text-sm text-muted" role="status">
    Loading your dashboard…
  </div>
  <div id="dashboard-error" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" hidden></div>
  <button id="dashboard-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>

  <div id="dashboard-content" class="space-y-9" hidden>
    <section aria-labelledby="dashboard-summary-title">
      <h2 id="dashboard-summary-title" class="sr-only">Summary</h2>
      <div id="dashboard-metrics" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"></div>
      <a href="#/mentor/requests" class="btn btn-outline mt-5">Manage incoming requests</a>
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
</main>`;
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
  if (!data || !data.summary || !Array.isArray(data.systemNotices)) {
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
  let disposed = false;

  async function loadDashboard() {
    loading.hidden = false;
    content.hidden = true;
    retry.hidden = true;
    error.hidden = true;
    try {
      const data = await mentorDashboardService.getMyDashboard();
      validateDashboard(data);
      if (disposed) return;

      // 1. Đọc các ID đã duyệt/từ chối từ localStorage
      const processedIds = JSON.parse(localStorage.getItem('processedRequestIds') || '[]');
      const rawIncoming = Array.isArray(data?.incomingRequests) ? data.incomingRequests : [];
      
      // 2. Tính số lượng pending thực sự còn lại
      const realPendingCount = Array.isArray(data?.incomingRequests)
        ? rawIncoming.filter(r => !processedIds.includes(String(r.id)) && !processedIds.includes(String(r.requestId))).length
        : Math.max(0, Number(data?.summary?.pendingInvitations || 0) - processedIds.length);

      // 3. Render summary đã được đồng bộ
      renderDashboardMetrics({
        ...data.summary,
        pendingInvitations: realPendingCount,
      });
      renderNotices(data.systemNotices);
      error.hidden = true;
      retry.hidden = true;
      content.hidden = false;
    } catch (loadError) {
      if (disposed) return;
      error.textContent = loadError.message || 'Unable to load your dashboard. Please try again.';
      error.hidden = false;
      retry.hidden = false;
      content.hidden = true;
    } finally {
      if (!disposed) loading.hidden = true;
    }
  }

  const handleRetry = () => void loadDashboard();
  retry.addEventListener('click', handleRetry);
  void loadDashboard();

  return () => {
    disposed = true;
    retry.removeEventListener('click', handleRetry);
  };
}
