import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorReviewService } from './mentorReviewService.js';
import { escapeHtml as e } from '../../shared/html.js';

const dateTime = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

function feedbackContent() {
  return `
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">MENTEE FEEDBACK</p><h1>Mentee feedback</h1><p>Published reviews from mentees you have mentored. Reviews cannot be edited or deleted.</p></div></div>
    <div id="feedback-summary" class="mb-6"></div>
    <div id="feedback-loading" class="text-sm text-muted" role="status">Loading your feedback…</div>
    <div id="feedback-error" class="admin-notice notice-error mb-4" role="alert" hidden></div>
    <button id="feedback-retry" class="btn btn-outline mb-4" type="button" hidden>Try again</button>
    <div id="feedback-empty" class="text-sm text-muted" hidden>No mentee reviews yet.</div>
    <div id="feedback-list" class="space-y-4"></div>
    <div id="feedback-pagination" class="mt-5 flex items-center justify-between gap-3" hidden>
      <button id="feedback-prev" class="btn btn-outline btn-sm" type="button">Newer</button>
      <span id="feedback-page-info" class="text-xs text-muted"></span>
      <button id="feedback-next" class="btn btn-outline btn-sm" type="button">Older</button>
    </div>`;
}

function reviewStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
}

function renderReviewCard(item) {
  return `<article class="rounded-xl border border-line bg-white p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-ink">${e(item.menteeName || 'A mentee')}</p>
        <p class="mt-0.5 text-xs text-muted">${e(item.sessionLabel || 'Mentorship session')}</p>
      </div>
      <p class="text-xs text-muted">${e(dateTime(item.createdAt))}</p>
    </div>
    <p class="mt-3 text-sm" aria-label="Rated ${Number(item.rating) || 0} out of 5"><span class="text-brand" aria-hidden="true">${reviewStars(item.rating)}</span> <span class="font-semibold text-ink">${(Number(item.rating) || 0).toFixed(1)}</span></p>
    <p class="mt-2 text-sm leading-6 text-muted">${e(item.comment || '')}</p>
  </article>`;
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
  const empty = shell.querySelector('#feedback-empty');
  const list = shell.querySelector('#feedback-list');
  const pagination = shell.querySelector('#feedback-pagination');
  const prev = shell.querySelector('#feedback-prev');
  const next = shell.querySelector('#feedback-next');
  const pageInfo = shell.querySelector('#feedback-page-info');

  const REVIEW_PAGE_SIZE = 5;
  let reviewPage = 0;
  let reviewCount = 0;
  let disposed = false;

  function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(reviewCount / REVIEW_PAGE_SIZE));
    const hasMultiple = reviewCount > REVIEW_PAGE_SIZE;
    pagination.hidden = !hasMultiple;
    if (!hasMultiple) return;
    prev.disabled = reviewPage <= 0;
    next.disabled = reviewPage >= totalPages - 1;
    pageInfo.textContent = `Page ${reviewPage + 1} of ${totalPages}`;
  }

  async function loadReviews(page = 0) {
    loading.hidden = false;
    error.hidden = true; retry.hidden = true;
    empty.hidden = true; pagination.hidden = true;
    list.innerHTML = '';
    try {
      const result = await mentorReviewService.getMyReviews({ page, size: REVIEW_PAGE_SIZE });
      if (disposed) return;
      reviewPage = result.page; reviewCount = result.reviewCount;
      summary.innerHTML = renderFeedbackSummary(result);
      if (!result.reviewCount) {
        empty.hidden = false;
      } else {
        list.innerHTML = result.items.map(renderReviewCard).join('');
        updatePagination();
      }
    } catch (reviewLoadError) {
      if (disposed) return;
      error.textContent = reviewLoadError.message || 'Unable to load mentee feedback.';
      error.hidden = false; retry.hidden = false;
    } finally {
      if (!disposed) loading.hidden = true;
    }
  }

  const reload = () => loadReviews(reviewPage);
  const goPrev = () => { if (reviewPage > 0) loadReviews(reviewPage - 1); };
  const goNext = () => loadReviews(reviewPage + 1);

  retry.addEventListener('click', reload);
  prev.addEventListener('click', goPrev);
  next.addEventListener('click', goNext);
  void loadReviews(0);

  return () => {
    disposed = true;
    retry.removeEventListener('click', reload);
    prev.removeEventListener('click', goPrev);
    next.removeEventListener('click', goNext);
    unbind();
  };
}

