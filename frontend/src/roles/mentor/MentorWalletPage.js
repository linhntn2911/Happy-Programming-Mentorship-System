import { apiClient } from '../../shared/apiClient.js';
import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorWalletService } from './mentorWalletService.js';
import { mentorReviewService } from './mentorReviewService.js';
import { escapeHtml as e } from '../../shared/html.js';
import { getPageNumbers } from '../../shared/pagination.js';

const money = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0)) + ' VND';
const dateTime = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

function walletContent() {
  return `
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">MENTOR EARNINGS &amp; FEEDBACK</p><h1>Earnings and feedback</h1><p>Verified earnings become available after the hold period recorded when payment is confirmed. Mentee reviews are shown below.</p></div></div>
    <div id="wallet-loading" class="admin-panel admin-panel-body text-sm text-muted" role="status">Loading your wallet…</div>
    <div id="wallet-error" class="admin-notice notice-error mb-5" role="alert" hidden></div>
    <button id="wallet-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
    <div id="wallet-content" hidden>
      <div id="wallet-stats" class="admin-stats"></div>
      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)]">
        <div class="space-y-5">
          <section class="admin-panel" aria-labelledby="wallet-history-title">
            <div class="admin-panel-heading"><div><p class="eyebrow mb-2">ACCOUNTING</p><h2 id="wallet-history-title">Wallet activity</h2><p>Each release and payout is recorded in the payment ledger.</p></div></div>
            <div id="wallet-entries" class="admin-panel-body"></div>
          </section>
          <section class="admin-panel" aria-labelledby="payout-history-title">
            <div class="admin-panel-heading"><div><p class="eyebrow mb-2">HISTORY</p><h2 id="payout-history-title">Payout requests</h2></div></div>
            <div id="payout-history" class="admin-panel-body"></div>
          </section>
        </div>
        <div class="space-y-5">
          <section class="admin-panel" aria-labelledby="bank-account-title">
            <div class="admin-panel-heading"><div><p class="eyebrow mb-2">DESTINATION</p><h2 id="bank-account-title">Bank account</h2><p>Save it once and reuse it for every withdrawal.</p></div></div>
            <div class="admin-panel-body">
              <p id="bank-message" class="mb-4 text-sm" role="status" aria-live="polite"></p>
              <div id="bank-current" class="mb-4 rounded-xl bg-lilac p-4 text-sm" hidden></div>
              <form id="bank-form" class="space-y-4" novalidate>
                <label class="admin-field">Bank name<input class="w-full" name="bankName" maxlength="100" required></label>
                <label class="admin-field">Account holder name<input class="w-full" name="accountName" maxlength="150" required></label>
                <label class="admin-field">Account number<input class="w-full" name="accountNumber" inputmode="numeric" pattern="[0-9]{6,34}" minlength="6" maxlength="34" autocomplete="off" required></label>
                <p class="text-xs leading-5 text-muted">Account numbers are encrypted before storage and are never shown again in full. Re-enter the number to update this account.</p>
                <button id="bank-submit" class="btn btn-outline" type="submit">Save bank account</button>
              </form>
            </div>
          </section>
          <section class="admin-panel" aria-labelledby="payout-form-title">
            <div class="admin-panel-heading"><div><p class="eyebrow mb-2">WITHDRAWAL</p><h2 id="payout-form-title">Request a payout</h2><p>Requests reserve available balance until the admin records payment or rejection.</p></div></div>
            <div class="admin-panel-body">
              <p id="payout-message" class="mb-4 text-sm" role="status" aria-live="polite"></p>
              <form id="payout-form" class="space-y-4" novalidate>
                <label class="admin-field">Amount (VND)<input class="w-full" name="amount" type="number" min="1" step="1" required></label>
                <p id="payout-destination" class="text-xs leading-5 text-muted"></p>
                <button id="payout-submit" class="btn btn-primary" type="submit">Continue</button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
    <section class="admin-panel mt-5" aria-labelledby="feedback-title">
      <div class="admin-panel-heading">
        <div><p class="eyebrow mb-2">MENTEE FEEDBACK</p><h2 id="feedback-title">Ratings and reviews</h2><p>Published reviews from mentees you have mentored. Reviews cannot be edited or deleted.</p></div>
        <div id="feedback-summary" class="text-right"></div>
      </div>
      <div class="admin-panel-body">
        <div id="feedback-loading" class="text-sm text-muted" role="status">Loading your feedback…</div>
        <div id="feedback-error" class="admin-notice notice-error mb-4" role="alert" hidden></div>
        <button id="feedback-retry" class="btn btn-outline mb-4" type="button" hidden>Try again</button>
        <div id="feedback-empty" class="text-sm text-muted" hidden>No mentee reviews yet.</div>
        <div id="feedback-list" class="space-y-4"></div>
        <div id="feedback-pagination" class="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-5" hidden>
          <div class="flex flex-wrap items-center gap-2">
            <button id="feedback-prev" class="btn btn-outline btn-sm" type="button">← Previous</button>
            <div id="feedback-pages" class="flex items-center gap-1.5" role="group" aria-label="Feedback page numbers"></div>
            <button id="feedback-next" class="btn btn-outline btn-sm" type="button">Next →</button>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted">
            <label for="feedback-page-select" class="font-medium text-ink">Go to:</label>
            <select id="feedback-page-select" class="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:border-brand focus:outline-none"></select>
            <span id="feedback-page-info"></span>
          </div>
        </div>
      </div>
    </section>
    <dialog id="payout-otp-dialog" class="modal" aria-labelledby="payout-otp-title">
      <button class="modal-close" id="payout-otp-close" type="button" aria-label="Close"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      <p class="eyebrow mt-4">VERIFY WITHDRAWAL</p>
      <h2 id="payout-otp-title" class="mt-2 font-display text-2xl">Enter your verification code</h2>
      <p id="payout-otp-summary" class="mt-3 text-sm leading-6 text-muted"></p>
      <p id="payout-otp-message" class="mt-3 text-sm" role="status" aria-live="polite"></p>
      <form id="payout-otp-form" class="mt-4 space-y-4" novalidate>
        <label class="admin-field">6-digit code<input class="w-full" name="otp" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" required></label>
        <div class="admin-actions flex flex-wrap gap-3">
          <button id="payout-otp-resend" class="btn btn-outline" type="button">Resend code</button>
          <button id="payout-otp-confirm" class="btn btn-primary" type="submit">Confirm withdrawal</button>
        </div>
      </form>
    </dialog>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;
}

function renderStats(wallet) {
  const metrics = [
    ['Held / under review', wallet.heldAmount], ['Available to withdraw', wallet.availableAmount],
    ['Reserved by requests', wallet.reservedAmount], ['Paid out', wallet.paidOutAmount],
  ];
  return metrics.map(([label, amount]) => `<article class="stat-card"><p class="stat-label">${label}</p><p class="stat-value">${money(amount)}</p></article>`).join('');
}

function renderEntries(entries = []) {
  if (!entries.length) return '<p class="text-sm text-muted">No released earnings or payout activity yet.</p>';
  return `<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Activity</th><th>Amount</th><th>Reference</th><th>Date (UTC)</th></tr></thead><tbody>${entries.map(entry => `<tr><td>${e(entry.type.replaceAll('_', ' '))}</td><td>${money(entry.amount)}</td><td>${e(entry.reference)}</td><td>${e(dateTime(entry.createdAt))}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderPayouts(requests = []) {
  if (!requests.length) return '<p class="text-sm text-muted">No payout requests yet.</p>';
  return `<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Requested</th><th>Amount</th><th>Destination</th><th>Status</th><th>Transfer / note</th></tr></thead><tbody>${requests.map(item => `<tr><td>${e(dateTime(item.requestedAt))}</td><td>${money(item.amount)}<small class="block">Fee: ${money(item.feeAmount)} · Net: ${money(item.netAmount ?? item.amount)}</small></td><td>${e(item.bankName)} ···· ${e(item.accountLast4)}</td><td>${e(item.status)}</td><td>${e(item.transferReference || item.rejectionReason || '—')}</td></tr>`).join('')}</tbody></table></div>`;
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
  return `<p class="text-2xl font-semibold text-ink">${average}<span class="text-sm text-muted"> / 5</span></p>
    <p class="text-xs text-muted">${count} review${count === 1 ? '' : 's'}</p>`;
}

export function MentorWalletPage() {
  return MentorLayout(walletContent(), authService.getCurrentUser(), 'wallet');
}

export function initializeMentorWalletPage(root) {
  const shell = root.matches?.('.admin-shell') ? root : root.querySelector('.admin-shell');
  if (!shell) return () => {};
  const unbind = bindMentorLayout(shell);
  const loading = shell.querySelector('#wallet-loading');
  const error = shell.querySelector('#wallet-error');
  const retry = shell.querySelector('#wallet-retry');
  const content = shell.querySelector('#wallet-content');
  const bankForm = shell.querySelector('#bank-form');
  const bankSubmit = shell.querySelector('#bank-submit');
  const bankMessage = shell.querySelector('#bank-message');
  const bankCurrent = shell.querySelector('#bank-current');
  const payoutForm = shell.querySelector('#payout-form');
  const payoutSubmit = shell.querySelector('#payout-submit');
  const payoutMessage = shell.querySelector('#payout-message');
  const payoutDestination = shell.querySelector('#payout-destination');
  const dialog = shell.querySelector('#payout-otp-dialog');
  const otpForm = shell.querySelector('#payout-otp-form');
  const otpInput = otpForm.elements.otp;
  const otpConfirm = shell.querySelector('#payout-otp-confirm');
  const otpResend = shell.querySelector('#payout-otp-resend');
  const otpClose = shell.querySelector('#payout-otp-close');
  const otpSummary = shell.querySelector('#payout-otp-summary');
  const otpMessage = shell.querySelector('#payout-otp-message');
  const feedbackSummary = shell.querySelector('#feedback-summary');
  const feedbackLoading = shell.querySelector('#feedback-loading');
  const feedbackError = shell.querySelector('#feedback-error');
  const feedbackRetry = shell.querySelector('#feedback-retry');
  const feedbackEmpty = shell.querySelector('#feedback-empty');
  const feedbackList = shell.querySelector('#feedback-list');
  const feedbackPagination = shell.querySelector('#feedback-pagination');
  const feedbackPrev = shell.querySelector('#feedback-prev');
  const feedbackNext = shell.querySelector('#feedback-next');
  const feedbackPageInfo = shell.querySelector('#feedback-page-info');
  const feedbackPages = shell.querySelector('#feedback-pages');
  const feedbackPageSelect = shell.querySelector('#feedback-page-select');

  let currentWallet = null;
  let savedBank = null;
  let pendingAmount = 0;
  let payoutQuote = null;
  let resendReadyAt = 0;
  const resendTimer = setInterval(updateResend, 1000);
  function updateResend() {
    const remaining = Math.max(0, Math.ceil((resendReadyAt - Date.now()) / 1000));
    otpResend.disabled = remaining > 0;
    otpResend.textContent = remaining ? `Resend code (${remaining}s)` : 'Resend code';
  }
  function acceptQuote(result) {
    payoutQuote = result;
    resendReadyAt = Date.now() + Number(result?.resendAfterSeconds || 60) * 1000;
    updateResend();
  }
  let operations = null;
  let toastTimer;
  let disposed = false;
  const REVIEW_PAGE_SIZE = 5;
  let reviewPage = 0;
  let reviewCount = 0;

  function showToast(text) {
    const toast = shell.querySelector('#toast') || document.querySelector('#toast');
    if (toast) {
      clearTimeout(toastTimer);
      toast.textContent = text;
      toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
    }
  }

  function destinationLabel() {
    return savedBank?.saved ? `${savedBank.bankName} ···· ${savedBank.accountLast4}` : '';
  }

  function renderBank() {
    if (savedBank?.saved) {
      bankCurrent.hidden = false;
      bankCurrent.innerHTML = `<p class="font-semibold text-ink">${e(savedBank.bankName)} ···· ${e(savedBank.accountLast4)}</p>
        <p class="mt-1 text-muted">${e(savedBank.accountName)}</p>
        <p class="mt-1 text-xs text-muted">Updated ${e(dateTime(savedBank.updatedAt))}</p>`;
      bankForm.elements.bankName.value = savedBank.bankName || '';
      bankForm.elements.accountName.value = savedBank.accountName || '';
      payoutDestination.textContent = `Withdraw to ${destinationLabel()} (${savedBank.accountName}).`;
    } else {
      bankCurrent.hidden = true;
      bankCurrent.innerHTML = '';
      payoutDestination.textContent = 'Save your bank account to enable withdrawals.';
    }
    updatePayoutAvailability();
  }

  function updatePayoutAvailability() {
    const available = Number(currentWallet?.availableAmount || 0);
    const ready = Boolean(savedBank?.saved) && available > Number(operations?.withdrawalThreshold ?? 10000);
    payoutForm.elements.amount.max = String(available);
    payoutForm.elements.amount.min = String(Number(operations?.withdrawalThreshold ?? 10000) + 1);
    payoutForm.elements.amount.placeholder = `Up to ${money(available)}`;
    payoutSubmit.disabled = !ready;
  }

  async function load() {
    loading.hidden = false; error.hidden = true; retry.hidden = true; content.hidden = true;
    try {
      const [wallet, config, bank] = await Promise.all([
        mentorWalletService.getWallet(),
        apiClient('/api/public/operations'),
        mentorWalletService.getBankAccount().catch(() => ({ saved: false })),
      ]);
      if (disposed) return;
      currentWallet = wallet;
      operations = config;
      savedBank = bank;
      shell.querySelector('#wallet-stats').innerHTML = renderStats(wallet);
      shell.querySelector('#wallet-entries').innerHTML = renderEntries(wallet.entries);
      shell.querySelector('#payout-history').innerHTML = renderPayouts(wallet.payoutRequests);
      renderBank();
      content.hidden = false;
    } catch (loadError) {
      if (disposed) return;
      error.textContent = loadError.message || 'Unable to load the mentor wallet.';
      error.hidden = false; retry.hidden = false;
    } finally { if (!disposed) loading.hidden = true; }
  }

  async function saveBank(event) {
    event.preventDefault(); bankMessage.textContent = '';
    if (!bankForm.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(bankForm));
    if (!payload.accountNumber || !/^\d{6,34}$/.test(payload.accountNumber.trim())) {
      bankMessage.textContent = 'Account number must contain between 6 and 34 digits.';
      return;
    }
    bankSubmit.disabled = true; bankSubmit.textContent = 'Saving…';
    try {
      savedBank = await mentorWalletService.saveBankAccount({
        bankName: payload.bankName.trim(),
        accountName: payload.accountName.trim(),
        accountNumber: payload.accountNumber.trim(),
      });
      bankForm.elements.accountNumber.value = '';
      bankMessage.textContent = 'Bank account saved.';
      showToast('Bank account saved securely.');
      renderBank();
    } catch (saveError) {
      bankMessage.textContent = saveError.message || 'Unable to save your bank account.';
    } finally {
      bankSubmit.disabled = false; bankSubmit.textContent = 'Save bank account';
    }
  }

  function openOtp(summaryText) {
    otpSummary.textContent = summaryText;
    otpMessage.textContent = '';
    otpInput.value = '';
    otpConfirm.disabled = false; otpConfirm.textContent = 'Confirm withdrawal';
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    otpInput.focus();
  }

  function otpSummaryText(amount) {
    return `We sent a 6-digit code to ${savedBank?.maskedEmail || 'your email'}. Wallet debit: ${money(amount)}. Fee: ${money(payoutQuote?.feeAmount)}. Bank transfer: ${money(payoutQuote?.netAmount ?? amount)} to ${destinationLabel()}. The code expires in ${Math.ceil((payoutQuote?.expiresInSeconds || 600) / 60)} minutes.`;
  }

  async function continuePayout(event) {
    event.preventDefault(); payoutMessage.textContent = '';
    if (!payoutForm.reportValidity()) return;
    if (!savedBank?.saved) { payoutMessage.textContent = 'Save your bank account first.'; return; }
    const amount = Number(payoutForm.elements.amount.value);
    const available = Number(currentWallet?.availableAmount || 0);
    if (!amount || amount <= Number(operations?.withdrawalThreshold ?? 10000) || amount > available) {
      payoutMessage.textContent = `Amount must be greater than ${money(operations?.withdrawalThreshold ?? 10000)} and cannot exceed your available balance (${money(available)}).`;
      return;
    }
    payoutSubmit.disabled = true; payoutSubmit.textContent = 'Sending code…';
    try {
      const result = await mentorWalletService.requestPayoutOtp(amount);
      pendingAmount = amount;
      acceptQuote(result);
      savedBank = { ...savedBank, maskedEmail: result?.maskedEmail };
      openOtp(otpSummaryText(amount));
    } catch (otpError) {
      payoutMessage.textContent = otpError.message || 'Unable to send the verification code.';
    } finally {
      payoutSubmit.textContent = 'Continue';
      updatePayoutAvailability();
    }
  }

  async function confirmPayout(event) {
    event.preventDefault(); otpMessage.textContent = '';
    const otp = (otpInput.value || '').trim();
    if (!/^\d{6}$/.test(otp)) { otpMessage.textContent = 'Enter the 6-digit code from your email.'; return; }
    otpConfirm.disabled = true; otpResend.disabled = true; otpConfirm.textContent = 'Submitting…';
    try {
      await mentorWalletService.requestPayout({ amount: pendingAmount, otp, expectedFee: payoutQuote?.feeAmount ?? 0 });
      dialog.close();
      payoutForm.reset();
      showToast('Payout request submitted. Funds are now reserved.');
      await load();
    } catch (submitError) {
      otpMessage.textContent = submitError.message || 'Unable to submit the payout request.';
    } finally {
      otpConfirm.disabled = false; updateResend(); otpConfirm.textContent = 'Confirm withdrawal';
    }
  }

  async function resendOtp() {
    if (!pendingAmount) return;
    otpResend.disabled = true; otpMessage.textContent = '';
    try {
      acceptQuote(await mentorWalletService.requestPayoutOtp(pendingAmount));
      otpSummary.textContent = otpSummaryText(pendingAmount);
      otpMessage.textContent = 'A new code is on its way.';
    } catch (resendError) {
      otpMessage.textContent = resendError.message || 'Unable to resend the code.';
    } finally { updateResend(); }
  }

  function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(reviewCount / REVIEW_PAGE_SIZE));
    const hasMultiple = reviewCount > REVIEW_PAGE_SIZE;
    feedbackPagination.hidden = !hasMultiple;
    if (!hasMultiple) return;
    feedbackPrev.disabled = reviewPage <= 0;
    feedbackNext.disabled = reviewPage >= totalPages - 1;
    feedbackPageInfo.textContent = `of ${totalPages} pages`;

    if (feedbackPages && feedbackPageSelect) {
      const pageNumbers = getPageNumbers(reviewPage, totalPages);
      feedbackPages.innerHTML = pageNumbers.map(item => {
        if (item === 'ellipsis') return '<span class="grid h-8 w-8 place-items-center text-xs text-muted" aria-hidden="true">…</span>';
        const isActive = item === reviewPage;
        return `<button type="button" data-page-jump="${item}" aria-current="${isActive ? 'page' : 'false'}" class="btn btn-sm min-w-8 h-8 px-2.5 text-xs font-semibold ${isActive ? 'btn-primary' : 'btn-outline'}">${item + 1}</button>`;
      }).join('');

      feedbackPageSelect.innerHTML = Array.from({ length: totalPages }, (_, i) =>
        `<option value="${i}" ${i === reviewPage ? 'selected' : ''}>Page ${i + 1}</option>`
      ).join('');
    }
  }

  async function loadReviews(page = 0) {
    feedbackLoading.hidden = false;
    feedbackError.hidden = true; feedbackRetry.hidden = true;
    feedbackEmpty.hidden = true; feedbackPagination.hidden = true;
    feedbackList.innerHTML = '';
    try {
      const result = await mentorReviewService.getMyReviews({ page, size: REVIEW_PAGE_SIZE });
      if (disposed) return;
      reviewPage = result.page; reviewCount = result.reviewCount;
      feedbackSummary.innerHTML = renderFeedbackSummary(result);
      if (!result.reviewCount) {
        feedbackEmpty.hidden = false;
      } else {
        feedbackList.innerHTML = result.items.map(renderReviewCard).join('');
        updatePagination();
      }
    } catch (reviewLoadError) {
      if (disposed) return;
      feedbackError.textContent = reviewLoadError.message || 'Unable to load mentee feedback.';
      feedbackError.hidden = false; feedbackRetry.hidden = false;
    } finally {
      if (!disposed) feedbackLoading.hidden = true;
    }
  }

  const reloadReviews = () => loadReviews(reviewPage);
  const prevReviews = () => { if (reviewPage > 0) loadReviews(reviewPage - 1); };
  const nextReviews = () => loadReviews(reviewPage + 1);
  const onFeedbackJump = event => {
    const jumpBtn = event.target.closest('[data-page-jump]');
    if (jumpBtn) {
      const target = Number(jumpBtn.dataset.pageJump);
      if (!Number.isNaN(target) && target !== reviewPage) loadReviews(target);
    }
  };
  const onFeedbackSelect = event => {
    const target = Number(event.target.value);
    if (!Number.isNaN(target) && target !== reviewPage) loadReviews(target);
  };

  retry.addEventListener('click', load);
  bankForm.addEventListener('submit', saveBank);
  payoutForm.addEventListener('submit', continuePayout);
  otpForm.addEventListener('submit', confirmPayout);
  otpResend.addEventListener('click', resendOtp);
  feedbackRetry.addEventListener('click', reloadReviews);
  feedbackPrev.addEventListener('click', prevReviews);
  feedbackNext.addEventListener('click', nextReviews);
  feedbackPages?.addEventListener('click', onFeedbackJump);
  feedbackPageSelect?.addEventListener('change', onFeedbackSelect);
  const closeDialog = () => dialog.close();
  otpClose.addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  void load();
  void loadReviews(0);

  return () => {
    disposed = true;
    clearTimeout(toastTimer);
    clearInterval(resendTimer);
    retry.removeEventListener('click', load);
    bankForm.removeEventListener('submit', saveBank);
    payoutForm.removeEventListener('submit', continuePayout);
    otpForm.removeEventListener('submit', confirmPayout);
    otpResend.removeEventListener('click', resendOtp);
    feedbackRetry.removeEventListener('click', reloadReviews);
    feedbackPrev.removeEventListener('click', prevReviews);
    feedbackNext.removeEventListener('click', nextReviews);
    feedbackPages?.removeEventListener('click', onFeedbackJump);
    feedbackPageSelect?.removeEventListener('change', onFeedbackSelect);
    otpClose.removeEventListener('click', closeDialog);
    if (dialog.open) dialog.close();
    unbind();
  };
}
