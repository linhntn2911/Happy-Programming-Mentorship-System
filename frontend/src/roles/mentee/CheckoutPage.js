import { authService } from '../auth/authService.js';
import { mentorshipRequestService } from './mentorshipRequestService.js';
import { BrandLogo } from '../../shared/BrandLogo.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import {
  renderUserDropdown,
  bindUserDropdown,
  renderNotificationBell,
  getInitials,
} from '../../shared/Header.js';

const esc = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatVnd = amount => {
  const num = Number(amount);
  return Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0';
};

const formatDate = value => value
  ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  : '';

let pollTimer = null;
let countdownTimer = null;

function clearTimers() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function headerHtml(user) {
  const name = user?.name || user?.email || 'Account';
  return `
    <header class="directory-header">
      <div class="container flex h-[76px] items-center justify-between gap-4">
        ${BrandLogo()}
        <nav class="flex items-center gap-3" aria-label="Main navigation">
          ${BrowseAllMentorsLink()}
          ${renderNotificationBell()}
          ${renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) })}
        </nav>
      </div>
    </header>
  `;
}

export async function mountCheckout(root, requestId, paymentReturn = false) {
  clearTimers();
  document.title = 'Mentorship Checkout | HappyProgramming';
  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = `
      <header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">
        ${BrandLogo()}<a href="#/login" class="btn btn-primary btn-sm">Log in</a>
      </div></header>
      <main class="min-h-screen bg-cream py-16"><div class="container max-w-xl text-center">
        <div class="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <h1 class="font-display text-2xl font-bold text-ink">Sign in required</h1>
          <p class="mt-2 text-sm text-muted">Sign in to view this checkout.</p>
          <a href="#/login" class="btn btn-primary mt-6 inline-block">Log in to continue</a>
        </div>
      </div></main>`;
    return;
  }

  if (!requestId) {
    root.innerHTML = `${headerHtml(user)}<main class="min-h-screen bg-cream py-16">
      <div class="container max-w-xl text-center"><div class="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 class="font-display text-2xl font-bold text-ink">Checkout not found</h1>
        <p class="mt-2 text-sm text-muted">Open checkout from one of your accepted applications.</p>
        <a href="#/applications" class="btn btn-primary mt-6">My applications</a>
      </div></div></main>`;
    bindUserDropdown(root);
    return;
  }

  root.innerHTML = `${headerHtml(user)}<main class="min-h-screen bg-cream py-12 sm:py-16">
    <div class="container max-w-4xl" id="checkout-container">
      <div class="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm" role="status">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
        Loading your mentorship checkout…
      </div>
    </div>
  </main>`;
  bindUserDropdown(root);
  const container = root.querySelector('#checkout-container');

  try {
    const info = await mentorshipRequestService.getCheckoutInfo(requestId);
    renderCheckoutDetails(root, container, user, info, paymentReturn);
  } catch (err) {
    container.innerHTML = `<div class="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold">!</span>
      <h1 class="mt-4 font-display text-2xl font-bold text-ink">Unable to load checkout</h1>
      <p class="mt-2 text-sm text-muted">${esc(err.message || 'The application could not be loaded.')}</p>
      <div class="mt-6 flex justify-center gap-3">
        <button type="button" id="checkout-retry-btn" class="btn btn-primary">Try again</button>
        <a href="#/applications" class="btn btn-outline">My applications</a>
      </div>
    </div>`;
    root.querySelector('#checkout-retry-btn')?.addEventListener('click', () => mountCheckout(root, requestId, paymentReturn));
  }
}

function renderCheckoutDetails(root, container, user, info, paymentReturn) {
  const isPaid = Boolean(info.isPaid);
  const isAccepted = info.status === 'ACCEPTED';
  const priceAvailable = info.priceAvailable !== false;
  const amountFormatted = priceAvailable ? formatVnd(info.amount) : 'Price unavailable';
  const currency = info.currency || 'VND';
  const paymentStatus = info.paymentStatus || '';
  const isPending = paymentStatus === 'PENDING';
  const hasActiveAttempt = isPending && Boolean(info.qrCodeUrl || info.paymentReference);

  if (isPaid) {
    clearTimers();
    container.innerHTML = `<div class="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm sm:p-12">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">✓</span>
      <span class="eyebrow mt-5 inline-block text-emerald-600">PAYMENT CONFIRMED · ESCROW ACTIVE</span>
      <h1 class="mt-2 font-display text-3xl font-bold text-ink">Your mentorship is active</h1>
      <p class="mt-3 text-sm leading-6 text-muted">Your payment for <strong>${esc(info.packageName)}</strong> with <strong>${esc(info.mentorName)}</strong> was received via SePay and placed in platform escrow.</p>
      <div class="mt-7 rounded-xl border border-line bg-cream p-5 text-left text-sm">
        <div class="flex justify-between gap-4"><span class="text-muted">Amount paid</span><strong>${amountFormatted} ${esc(currency)}</strong></div>
        <div class="mt-3 flex justify-between gap-4"><span class="text-muted">Payment state</span><strong class="text-emerald-700">Verified & Active</strong></div>
      </div>
      <div class="mt-7 flex flex-wrap justify-center gap-3"><a href="#/workspace?requestId=${encodeURIComponent(info.requestId)}" class="btn btn-primary">Open mentorship workspace</a><a href="#/applications" class="btn btn-outline">View my applications</a></div>
    </div>`;
    return;
  }

  if (!isAccepted) {
    clearTimers();
    container.innerHTML = `<div class="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <span class="eyebrow text-amber-700">APPLICATION: ${esc(info.status)}</span>
      <h1 class="mt-2 font-display text-2xl font-bold text-ink">Payment is unavailable</h1>
      <p class="mt-2 text-sm leading-6 text-muted">The mentor must accept this application before checkout can begin.</p>
      <a href="#/applications" class="btn btn-primary mt-6">My applications</a>
    </div>`;
    return;
  }

  const failed = paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED';
  const mentorInitials = getInitials(info.mentorName || 'Mentor');
  const avatarHtml = info.mentorAvatarUrl
    ? `<img src="${esc(info.mentorAvatarUrl)}" alt="${esc(info.mentorName)}" class="h-14 w-14 rounded-full border border-line object-cover">`
    : `<div class="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-bold uppercase text-white">${esc(mentorInitials)}</div>`;

  const bankName = info.bankName || 'TPBank';
  const accountNumber = info.accountNumber || '00000806194';
  const accountHolder = info.accountHolder || 'NGUYEN THI NGOC LINH';
  const qrUrl = info.qrCodeUrl || (info.paymentReference ? `https://qr.sepay.vn/img?bank=${encodeURIComponent(bankName)}&acc=${encodeURIComponent(accountNumber)}&template=compact&amount=${Number(info.amount) || 0}&des=${encodeURIComponent(info.paymentReference)}` : null);

  container.innerHTML = `<div>
    <a href="#/applications" class="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">← Back to my applications</a>
    <div class="mb-8">
      <p class="eyebrow">SEPAY SECURE QR CHECKOUT</p>
      <h1 class="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Review your mentorship</h1>
      <p class="mt-2 text-sm text-muted">Scan the SePay VietQR code using your banking app to transfer payment. Your mentorship activates automatically upon confirmation.</p>
    </div>

    ${failed ? `<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      Your previous payment attempt ${paymentStatus === 'FAILED' ? 'was not completed' : 'expired'}. The application is still accepted; you can generate a new payment QR code.
    </div>` : ''}

    <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <section class="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7" aria-labelledby="checkout-mentor-heading">
          <h2 id="checkout-mentor-heading" class="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Accepted mentorship package</h2>
          <div class="flex items-start gap-4 border-b border-line pb-5">
            ${avatarHtml}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="truncate text-lg font-bold text-ink">${esc(info.mentorName)}</h3>
                <span class="rounded-full bg-lilac px-3 py-1 text-xs font-semibold text-brand">${esc(info.packageName || 'Monthly Mentorship')}</span>
              </div>
              <p class="mt-1 text-xs text-muted">${esc(info.mentorTitle || 'Mentor')}</p>
            </div>
          </div>
          <dl class="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt class="text-xs text-muted">Mentor sessions</dt><dd class="mt-1 font-semibold text-ink">${Number(info.callsPerPeriod) || 4} calls / month</dd></div>
            <div><dt class="text-xs text-muted">Session length</dt><dd class="mt-1 font-semibold text-ink">${Number(info.sessionDurationMinutes) || 45} minutes</dd></div>
            <div><dt class="text-xs text-muted">Billing period</dt><dd class="mt-1 font-semibold text-ink">Monthly</dd></div>
            <div><dt class="text-xs text-muted">Application</dt><dd class="mt-1 font-semibold text-ink">#${esc(info.requestId)}</dd></div>
          </dl>
          ${info.learningGoals ? `<div class="mt-5 border-t border-line pt-4"><h3 class="text-xs font-bold uppercase tracking-wider text-muted">Your learning goals</h3><p class="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 text-sm leading-6 text-ink">${esc(info.learningGoals)}</p></div>` : ''}
        </section>

        <!-- Payment QR & Bank Transfer Section -->
        <section class="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7" aria-labelledby="checkout-method-heading">
          <h2 id="checkout-method-heading" class="text-xs font-bold uppercase tracking-wider text-muted">Payment method: Bank Transfer QR</h2>
          
          <div id="qr-panel" class="${hasActiveAttempt ? '' : 'hidden'} mt-5">
            <div class="rounded-2xl border border-brand/20 bg-gradient-to-b from-lilac/30 to-white p-6 text-center">
              <div class="inline-block rounded-2xl bg-white p-3 shadow-md border border-line">
                <img id="qr-image" src="${esc(qrUrl || '')}" alt="SePay VietQR Payment" class="h-60 w-60 object-contain mx-auto">
              </div>
              <p class="mt-3 text-xs font-medium text-ink">Scan with any Mobile Banking App (Napas 24/7)</p>
              
              <!-- Countdown timer -->
              <div class="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand shadow-sm border border-line">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Time remaining: </span>
                <span id="countdown-text" class="font-mono font-bold">15:00</span>
              </div>
            </div>

            <!-- Transfer details table with copy buttons -->
            <div class="mt-6 rounded-xl border border-line bg-cream p-5 text-sm space-y-3">
              <div class="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span class="text-xs text-muted">Receiving Bank</span>
                <strong class="font-semibold text-ink">${esc(bankName)}</strong>
              </div>
              <div class="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span class="text-xs text-muted">Account Number</span>
                <div class="flex items-center gap-2">
                  <code class="font-mono font-bold text-ink" id="bank-acc-num">${esc(accountNumber)}</code>
                  <button type="button" class="btn btn-outline btn-xs" data-copy-target="#bank-acc-num">Copy</button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span class="text-xs text-muted">Account Holder</span>
                <strong class="font-semibold uppercase text-ink">${esc(accountHolder)}</strong>
              </div>
              <div class="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span class="text-xs text-muted">Exact Amount</span>
                <div class="flex items-center gap-2">
                  <strong class="font-display font-bold text-brand" id="bank-acc-amount">${amountFormatted} ${esc(currency)}</strong>
                  <button type="button" class="btn btn-outline btn-xs" data-copy-target="#bank-acc-amount" data-copy-value="${Number(info.amount) || 0}">Copy</button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <span class="text-xs text-muted">Transfer Code</span>
                  <p class="text-[11px] text-brand">Required for auto-activation</p>
                </div>
                <div class="flex items-center gap-2">
                  <code class="font-mono font-bold text-brand text-base" id="bank-acc-code">${esc(info.paymentReference || '')}</code>
                  <button type="button" class="btn btn-primary btn-xs" data-copy-target="#bank-acc-code">Copy</button>
                </div>
              </div>
            </div>

            <!-- Real-time polling indicator -->
            <div class="mt-5 flex items-center justify-center gap-2 text-xs text-muted">
              <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
              <span>Listening for bank transfer via SePay... (Updates automatically)</span>
            </div>
          </div>

          <div id="no-qr-panel" class="${hasActiveAttempt ? 'hidden' : ''} mt-4 rounded-xl border border-line bg-lilac/20 p-5">
            <div class="flex items-start gap-4">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-white font-bold text-lg">QR</span>
              <div>
                <h3 class="font-bold text-ink">Instant Bank QR Transfer</h3>
                <p class="mt-1 text-xs text-muted">Click below to generate your personalized VietQR code. You can scan it directly with your mobile banking app to complete payment.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="space-y-6 lg:sticky lg:top-8">
        <section class="rounded-2xl border border-line bg-white p-6 shadow-sm" aria-labelledby="checkout-summary-heading">
          <h2 id="checkout-summary-heading" class="mb-5 text-xs font-bold uppercase tracking-wider text-muted">Order summary</h2>
          <div class="space-y-3 border-b border-line pb-5 text-sm">
            <div class="flex justify-between gap-4"><span class="text-muted">${esc(info.packageName || 'Monthly Mentorship')}</span><strong class="text-ink">${amountFormatted}${priceAvailable ? ` ${esc(currency)}` : ''}</strong></div>
            <div class="flex justify-between gap-4 text-xs"><span class="text-muted">Platform escrow</span><span class="font-semibold text-emerald-700">Included</span></div>
            <div class="flex justify-between gap-4 text-xs"><span class="text-muted">Billing</span><span class="font-semibold text-ink">Monthly</span></div>
          </div>
          <div class="flex items-baseline justify-between gap-4 pt-4"><span class="font-bold text-ink">Due now</span><strong class="font-display text-2xl text-brand">${amountFormatted}${priceAvailable ? ` ${esc(currency)}` : ''}</strong></div>
          
          <div id="checkout-error" class="mt-4 hidden rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert"></div>

          ${priceAvailable ? '' : '<p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="alert">We could not verify the price accepted for this application because the mentor’s package changed after you applied. Please ask the mentor to confirm the package before paying.</p>'}

          <button type="button" id="checkout-submit-btn" class="btn btn-primary mt-6 w-full py-3.5 text-sm font-semibold" ${!priceAvailable ? 'disabled' : ''}>
            ${!priceAvailable ? 'Payment unavailable' : hasActiveAttempt ? 'Refresh Payment QR' : 'Prepare SePay QR payment'}
          </button>
          
          <p class="mt-3 text-center text-[11px] text-muted">Upon transfer, SePay automatically notifies HappyProgramming to activate your course.</p>
        </section>
      </aside>
    </div>
  </div>`;

  bindCopyButtons(container);

  if (hasActiveAttempt) {
    startCountdown(container, info.paymentExpiresAt);
    startPolling(root, info.requestId);
  }

  container.querySelector('#checkout-submit-btn')?.addEventListener('click', () => startSepay(root, container, info));
}

function bindCopyButtons(container) {
  container.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetSelector = btn.getAttribute('data-copy-target');
      const overrideVal = btn.getAttribute('data-copy-value');
      const targetEl = container.querySelector(targetSelector);
      const textToCopy = overrideVal || targetEl?.textContent?.trim() || '';
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const origText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = origText; }, 1500);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    });
  });
}

function startCountdown(container, expiresAt) {
  if (countdownTimer) clearInterval(countdownTimer);
  const countdownEl = container.querySelector('#countdown-text');
  if (!countdownEl) return;

  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 15 * 60 * 1000;

  function update() {
    const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (diff <= 0) {
      clearInterval(countdownTimer);
      countdownEl.textContent = 'Expired';
    }
  }

  update();
  countdownTimer = setInterval(update, 1000);
}

function startPolling(root, requestId) {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    try {
      const status = await mentorshipRequestService.getCheckoutInfo(requestId);
      if (status.isPaid || status.paymentStatus === 'SUCCEEDED') {
        clearTimers();
        mountCheckout(root, requestId, false);
      }
    } catch (err) {
      console.warn('Polling checkout info error:', err);
    }
  }, 3000);
}

async function startSepay(root, container, info) {
  const button = container.querySelector('#checkout-submit-btn');
  const errorBox = container.querySelector('#checkout-error');
  if (!button) return;
  button.disabled = true;
  button.textContent = 'Generating QR code…';
  errorBox?.classList.add('hidden');

  try {
    const response = await mentorshipRequestService.processCheckout(info.requestId);
    if (!response?.paymentReference) {
      throw new Error('Could not generate SePay payment reference.');
    }
    // Re-mount checkout to show the active QR panel
    mountCheckout(root, info.requestId, false);
  } catch (err) {
    button.disabled = false;
    button.textContent = 'Prepare SePay QR payment';
    if (errorBox) {
      errorBox.textContent = err.message || 'Could not start payment. Please try again.';
      errorBox.classList.remove('hidden');
    }
  }
}
