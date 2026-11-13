import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorReviewService } from './mentorReviewService.js';
import { getInitials } from '../../shared/Header.js';
import { renderPagination, bindPagination } from '../../shared/pagination.js';
import { escapeHtml as e } from '../../shared/html.js';

const dateTime = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';
const PAGE_SIZE = 5;
const FETCH_SIZE = 50;

function feedbackContent() {
  return `
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">MENTEE FEEDBACK</p><h1>Mentee feedback</h1><p>Published reviews from mentees you have mentored. Reviews cannot be edited or deleted.</p></div></div>
    <div id="feedback-summary" class="mb-6"></div>
    <div id="feedback-loading" class="text-sm text-muted" role="status">Loading your feedback…</div>
    <div id="feedback-error" class="admin-notice notice-error mb-4" role="alert" hidden></div>
    <button id="feedback-retry" class="btn btn-outline mb-4" type="button" hidden>Try again</button>
    <div id="feedback-content" class="admin-panel">
    <div id="feedback-toolbar" class="admin-toolbar flex-wrap items-end gap-3 justify-between">
      <div class="flex flex-wrap items-end gap-3 grow">
      <label class="admin-field admin-search" for="feedback-search">Search feedback<input id="feedback-search" class="w-full" type="search" placeholder="Search by mentee, session or comment..." autocomplete="off"></label>
      <label class="admin-field" for="feedback-rating-filter">Rating
        <select id="feedback-rating-filter" class="w-full">
          <option value="ALL">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </label>
      <label class="admin-field" for="feedback-package-filter">Package
        <select id="feedback-package-filter" class="w-full">
          <option value="ALL">All packages</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ONE_OFF">One-off</option>
        </select>
      </label>
      </div>
      <p id="feedback-result-count" class="text-xs text-muted self-center" aria-live="polite"></p>
    </div>
    <div id="feedback-empty" class="admin-panel-body text-center" hidden>
      <p class="eyebrow mb-2">NO FEEDBACK YET</p>
      <h2 class="font-display text-2xl text-ink">No mentee reviews yet</h2>
      <p id="feedback-empty-detail" class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Reviews from mentees you have mentored will appear here once a session is completed and published.</p>
    </div>
    <div id="feedback-table-wrap" class="data-table-scroll hidden md:block">
      <table class="data-table min-w-[860px]">
        <thead><tr>
          <th scope="col" class="px-4 py-3">Mentee</th>
          <th scope="col" class="px-4 py-3">Session / package</th>
          <th scope="col" class="px-4 py-3">Rating</th>
          <th scope="col" class="px-4 py-3">Comment</th>
          <th scope="col" class="px-4 py-3">Submitted</th>
        </tr></thead>
        <tbody id="feedback-rows" class="divide-y divide-line"></tbody>
      </table>
    </div>
    <div id="feedback-list" class="grid gap-3 p-4 md:hidden"></div>
    <div id="feedback-pagination"></div>
    </div>`;
}

function reviewStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
}

const PACKAGE_LABELS = { MONTHLY: 'Monthly', ONE_OFF: 'One-off session' };

function packageBadge(packageType) {
  const oneOff = packageType === 'ONE_OFF';
  const label = PACKAGE_LABELS[packageType] || 'Monthly';
  return `<span class="inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${oneOff ? 'border-brand/30 bg-lilac text-brand' : 'border-line bg-cream text-muted'}">${e(label)}</span>`;
}

function renderReviewCard(item) {
  const name = item.menteeName || 'A mentee';
  return `<article class="rounded-xl border border-line bg-white p-4">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lilac text-sm font-semibold text-brand" aria-hidden="true">${e(getInitials(name))}</span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold text-ink">${e(name)}</p>
            ${packageBadge(item.packageType)}
          </div>
          <p class="text-xs text-muted">${e(dateTime(item.createdAt))}</p>
        </div>
        <p class="mt-1 text-xs text-muted">${e(item.sessionLabel || 'Mentorship session')}</p>
        <p class="mt-2 text-sm" aria-label="Rated ${Number(item.rating) || 0} out of 5"><span class="text-brand" aria-hidden="true">${reviewStars(item.rating)}</span> <span class="font-semibold text-ink">${(Number(item.rating) || 0).toFixed(1)}</span></p>
        <p class="mt-2 text-sm leading-6 text-muted">${e(item.comment || '')}</p>
      </div>
    </div>
  </article>`;
}

function renderReviewRow(item) {
  const name = item.menteeName || 'A mentee';
  const rating = Number(item.rating) || 0;
  return `<tr>
    <td class="px-4 py-4"><div class="flex items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac text-xs font-semibold text-brand" aria-hidden="true">${e(getInitials(name))}</span><strong class="text-sm text-ink">${e(name)}</strong></div></td>
    <td class="px-4 py-4"><p class="text-sm font-semibold text-ink">${e(item.sessionLabel || 'Mentorship session')}</p><div class="mt-1">${packageBadge(item.packageType)}</div></td>
    <td class="px-4 py-4"><p class="whitespace-nowrap text-sm" aria-label="Rated ${rating} out of 5"><span class="text-brand" aria-hidden="true">${reviewStars(rating)}</span> <strong class="text-ink">${rating.toFixed(1)}</strong></p></td>
    <td class="max-w-md px-4 py-4"><p class="line-clamp-3 text-sm leading-6 text-muted" title="${e(item.comment || '')}">${e(item.comment || '—')}</p></td>
    <td class="whitespace-nowrap px-4 py-4 text-xs text-muted">${e(dateTime(item.createdAt))}</td>
  </tr>`;
}

function renderFeedbackSummary(summary) {
  const average = summary.averageRating == null ? '—' : Number(summary.averageRating).toFixed(1);
  const count = Number(summary.reviewCount) || 0;
  const stars = summary.averageRating == null ? '' : `<span class="text-lg text-brand" aria-hidden="true">${reviewStars(Math.round(Number(summary.averageRating)))}</span>`;
  return `<div class="inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white px-6 py-4">
    <p class="text-3xl font-semibold text-ink">${average}<span class="text-base font-normal text-muted"> / 5</span></p>
    ${stars}
    <p class="text-xs text-muted">${count} review${count === 1 ? '' : 's'}</p>
  </div>`;
}

export function MenteeFeedbackPage() {
  return MentorLayout(feedbackContent(), authService.getCurrentUser(), 'feedback');
}

export function initializeMenteeFeedbackPage(root) {
  const shell = root.matches?.('.admin-shell') ? root : root.querySelector('.admin-shell');
  if (!shell) return () => {};
  const unbind = bindMentorLayout(shell);
  const summary = shell.querySelector('#feedback-summary');
  const loading = shell.querySelector('#feedback-loading');
  const error = shell.querySelector('#feedback-error');
  const retry = shell.querySelector('#feedback-retry');
  const search = shell.querySelector('#feedback-search');
  const ratingFilter = shell.querySelector('#feedback-rating-filter');
  const packageFilter = shell.querySelector('#feedback-package-filter');
  const resultCount = shell.querySelector('#feedback-result-count');
  const empty = shell.querySelector('#feedback-empty');
  const emptyEyebrow = empty.querySelector('.eyebrow');
  const emptyTitle = empty.querySelector('h2');
  const emptyDetail = shell.querySelector('#feedback-empty-detail');
  const list = shell.querySelector('#feedback-list');
  const rows = shell.querySelector('#feedback-rows');
  const tableWrap = shell.querySelector('#feedback-table-wrap');
  const pagination = shell.querySelector('#feedback-pagination');

  let allReviews = [];
  let aggregate = { averageRating: null, reviewCount: 0 };
  let page = 1;
  let request = 0;
  let disposed = false;

  function matches(item) {
    const term = search.value.trim().toLowerCase();
    if (term) {
      const haystack = `${item.menteeName || ''} ${item.sessionLabel || ''} ${item.comment || ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (ratingFilter.value !== 'ALL' && Number(item.rating) !== Number(ratingFilter.value)) return false;
    if (packageFilter.value !== 'ALL') {
      const type = item.packageType === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY';
      if (type !== packageFilter.value) return false;
    }
    return true;
  }

  function render() {
    const filtered = allReviews.filter(matches);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const paged = filtered.slice(start, start + PAGE_SIZE);

    rows.innerHTML = paged.map(renderReviewRow).join('');
    list.innerHTML = paged.map(renderReviewCard).join('');
    tableWrap.hidden = !filtered.length;
    pagination.innerHTML = renderPagination({ page, totalPages, label: 'Feedback pages' });

    if (!filtered.length) {
      const noReviewsAtAll = allReviews.length === 0;
      empty.hidden = false;
      emptyEyebrow.textContent = noReviewsAtAll ? 'NO FEEDBACK YET' : 'NO MATCHES';
      emptyTitle.textContent = noReviewsAtAll ? 'No mentee reviews yet' : 'No matching reviews';
      emptyDetail.textContent = noReviewsAtAll
        ? 'Reviews from mentees you have mentored will appear here once a session is completed and published.'
        : 'No reviews match your current search or filters. Try widening them to see all your feedback.';
      resultCount.textContent = noReviewsAtAll ? '' : `0 of ${allReviews.length} review${allReviews.length === 1 ? '' : 's'}`;
    } else {
      empty.hidden = true;
      resultCount.textContent = `Showing ${paged.length} of ${filtered.length} review${filtered.length === 1 ? '' : 's'}${filtered.length === allReviews.length ? '' : ` (filtered from ${allReviews.length})`}`;
    }
  }

  async function fetchAllReviews() {
    const first = await mentorReviewService.getMyReviews({ page: 0, size: FETCH_SIZE });
    const items = [...first.items];
    const total = Number(first.reviewCount) || 0;
    let next = 1;
    while (items.length < total && next < 100) {
      const chunk = await mentorReviewService.getMyReviews({ page: next, size: FETCH_SIZE });
      if (!chunk.items.length) break;
      items.push(...chunk.items);
      next += 1;
    }
    return { items, aggregate: { averageRating: first.averageRating, reviewCount: total } };
  }

  async function load() {
    const current = ++request;
    loading.hidden = false;
    error.hidden = true; retry.hidden = true;
    empty.hidden = true;
    list.innerHTML = ''; rows.innerHTML = ''; pagination.innerHTML = ''; summary.innerHTML = '';
    try {
      const result = await fetchAllReviews();
      if (disposed || current !== request) return;
      allReviews = result.items;
      aggregate = result.aggregate;
      page = 1;
      summary.innerHTML = renderFeedbackSummary(aggregate);
      render();
    } catch (loadError) {
      if (disposed || current !== request) return;
      error.textContent = loadError.message || 'Unable to load mentee feedback.';
      error.hidden = false; retry.hidden = false;
    } finally {
      if (!disposed && current === request) loading.hidden = true;
    }
  }

  const reload = () => load();
  const onSearch = () => { page = 1; render(); };
  const unbindPagination = bindPagination(pagination, { onChange: next => { page = next; render(); } });

  retry.addEventListener('click', reload);
  search.addEventListener('input', onSearch);
  ratingFilter.addEventListener('change', onSearch);
  packageFilter.addEventListener('change', onSearch);
  void load();

  return () => {
    disposed = true;
    retry.removeEventListener('click', reload);
    search.removeEventListener('input', onSearch);
    ratingFilter.removeEventListener('change', onSearch);
    packageFilter.removeEventListener('change', onSearch);
    unbindPagination();
    unbind();
  };
}

