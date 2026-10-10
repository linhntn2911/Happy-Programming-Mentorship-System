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
  return Number.isNaN(num) ? '0' : num.toLocaleString('vi-VN');
};

function headerHtml(user) {
  const name = user?.name || user?.email || 'Account';
  return `
    <header class="directory-header">
      <div class="container flex h-[76px] items-center justify-between gap-4">
        ${BrandLogo()}
        <nav class="flex items-center gap-3" aria-label="Main navigation">
          ${BrowseAllMentorsLink()}
          ${renderNotificationBell()}
          ${renderUserDropdown({
            currentUser: user,
            displayName: name,
            initials: getInitials(name),
          })}
        </nav>
      </div>
    </header>
  `;
}

export async function mountCheckout(root, requestId) {
  document.title = 'Secure Escrow Checkout | HappyProgramming';

  const user = authService.getCurrentUser();
  if (!user) {
    root.innerHTML = `
      <header class="directory-header">
        <div class="container flex h-[76px] items-center justify-between gap-4">
          ${BrandLogo()}
          <nav class="flex items-center gap-3">
            ${BrowseAllMentorsLink()}
            <a href="#/login" class="btn btn-primary btn-sm">Log in</a>
          </nav>
        </div>
      </header>
      <main class="min-h-screen bg-cream py-16">
        <div class="container max-w-xl text-center">
          <div class="rounded-2xl border border-line bg-white p-8 shadow-sm">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac text-brand font-bold text-lg">🔒</span>
            <h1 class="mt-4 font-display text-2xl font-bold text-ink">Sign in required</h1>
            <p class="mt-2 text-sm text-muted">Please sign in to complete payment for your mentorship request.</p>
            <a href="#/login" class="btn btn-primary mt-6 inline-block">Log in to continue</a>
          </div>
        </div>
      </main>
    `;
    return;
  }

  if (!requestId) {
    root.innerHTML = `
      ${headerHtml(user)}
      <main class="min-h-screen bg-cream py-16">
        <div class="container max-w-xl text-center">
          <div class="rounded-2xl border border-line bg-white p-8 shadow-sm">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">!</span>
            <h1 class="mt-4 font-display text-2xl font-bold text-ink">Invalid checkout reference</h1>
            <p class="mt-2 text-sm text-muted">No mentorship request ID was specified. Please check your notifications for the direct link.</p>
            <div class="mt-6 flex justify-center gap-3">
              <a href="#/notifications" class="btn btn-primary">View notifications</a>
              <a href="#/account" class="btn btn-outline">My profile</a>
            </div>
          </div>
        </div>
      </main>
    `;
    bindUserDropdown(root);
    return;
  }

  // Render initial loading skeleton
  root.innerHTML = `
    ${headerHtml(user)}
    <main class="min-h-screen bg-cream py-12 sm:py-16">
      <div class="container max-w-4xl" id="checkout-container">
        <div class="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm" role="status">
          <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent mb-4"></div>
          Loading your mentorship checkout details…
        </div>
      </div>
    </main>
  `;
  bindUserDropdown(root);

  const container = root.querySelector('#checkout-container');

  try {
    const checkoutInfo = await mentorshipRequestService.getCheckoutInfo(requestId);
    renderCheckoutDetails(root, container, user, checkoutInfo);
  } catch (err) {
    container.innerHTML = `
      <div class="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">✕</span>
        <h1 class="mt-4 font-display text-2xl font-bold text-ink">Unable to load checkout</h1>
        <p class="mt-2 text-sm text-muted">${esc(err.message || 'The mentorship request could not be loaded or you are not authorized.')}</p>
        <div class="mt-6 flex justify-center gap-3">
          <button type="button" id="checkout-retry-btn" class="btn btn-primary">Try again</button>
          <a href="#/notifications" class="btn btn-outline">Back to notifications</a>
        </div>
      </div>
    `;
    root.querySelector('#checkout-retry-btn')?.addEventListener('click', () => {
      mountCheckout(root, requestId);
    });
  }
}

function renderCheckoutDetails(root, container, user, info) {
  const isPaid = info.isPaid || info.status === 'ACTIVE' || info.status === 'TRIALING';
  const isAccepted = info.status === 'ACCEPTED';
  const amountFormatted = formatVnd(info.amount);
  const currency = info.currency || 'VND';

  if (isPaid) {
    container.innerHTML = `
      <div class="rounded-2xl border border-line bg-white p-8 sm:p-12 text-center shadow-sm max-w-2xl mx-auto">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold">✓</span>
        <span class="eyebrow mt-5 inline-block text-emerald-600">ACTIVE MENTORSHIP</span>
        <h1 class="mt-2 font-display text-3xl font-bold text-ink">Mentorship is already active</h1>
        <p class="mt-3 text-sm leading-6 text-muted">
          Your payment for <strong>${esc(info.packageName || 'Monthly Mentorship')}</strong> with <strong>${esc(info.mentorName || 'your mentor')}</strong> has already been received and held in Escrow. Your 7-day trial is currently in effect.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-4">
          <a href="#/account" class="btn btn-primary">Go to my profile</a>
          <a href="#/notifications" class="btn btn-outline">View notifications</a>
        </div>
      </div>
    `;
    return;
  }

  if (!isAccepted) {
    container.innerHTML = `
      <div class="rounded-2xl border border-line bg-white p-8 text-center shadow-sm max-w-xl mx-auto">
        <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xl">ℹ</span>
        <span class="eyebrow mt-4 inline-block text-amber-700">STATUS: ${esc(info.status)}</span>
        <h1 class="mt-2 font-display text-2xl font-bold text-ink">Payment not available</h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          This mentorship request is currently in <strong>${esc(info.status)}</strong> status. Payment can only be completed once the mentor accepts your application.
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <a href="#/notifications" class="btn btn-primary">Notifications</a>
          <a href="#/account" class="btn btn-outline">My profile</a>
        </div>
      </div>
    `;
    return;
  }

  // Active checkout form
  const mentorInitials = getInitials(info.mentorName || 'Mentor');
  const avatarHtml = info.mentorAvatarUrl
    ? `<img src="${esc(info.mentorAvatarUrl)}" alt="${esc(info.mentorName)}" class="h-14 w-14 rounded-full object-cover border border-line">`
    : `<div class="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-bold text-white uppercase">${mentorInitials}</div>`;

  container.innerHTML = `
    <div>
      <a href="#/notifications" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mb-6">
        ← Back to notifications
      </a>

      <div class="mb-8">
        <p class="eyebrow">ESCROW PROTECTED CHECKOUT</p>
        <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink mt-1">Complete your mentorship payment</h1>
        <p class="mt-2 text-sm text-muted">
          Your payment is held safely in Escrow during your 7-day trial. Cancel anytime within 7 days for a prorated refund.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Left: Mentorship and Payment Method Details (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Package card -->
          <div class="rounded-2xl border border-line bg-white p-6 sm:p-7 shadow-sm">
            <h2 class="text-xs font-bold uppercase tracking-wider text-muted mb-4">Selected Learning Package</h2>
            
            <div class="flex items-start gap-4 pb-6 border-b border-line">
              ${avatarHtml}
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="text-lg font-bold text-ink truncate">${esc(info.mentorName)}</h3>
                  <span class="rounded-full bg-lilac px-3 py-0.5 text-xs font-semibold text-brand">
                    ${esc(info.packageName || 'Monthly Mentorship')}
                  </span>
                </div>
                <p class="text-xs text-muted mt-0.5">${esc(info.mentorTitle || 'Professional Mentor')}</p>
              </div>
            </div>

            <!-- Inclusions -->
            <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex items-center gap-3 p-3 rounded-xl bg-cream border border-line/60">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-ink">${info.callsPerPeriod || 4} 1-on-1 Calls / month</p>
                  <p class="text-[11px] text-muted">${info.sessionDurationMinutes || 45} mins per video call</p>
                </div>
              </div>

              <div class="flex items-center gap-3 p-3 rounded-xl bg-cream border border-line/60">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-ink">${info.trialDays || 7}-Day Trial Guarantee</p>
                  <p class="text-[11px] text-muted">100% money-back escrow window</p>
                </div>
              </div>
            </div>

            <!-- Learning goals -->
            ${
              info.learningGoals
                ? `
              <div class="mt-6 pt-5 border-t border-line">
                <p class="text-xs font-bold uppercase tracking-wider text-muted mb-2">Agreed Learning Goals</p>
                <div class="rounded-xl bg-lilac/30 p-4 border border-line/50 text-xs text-ink leading-relaxed whitespace-pre-wrap">
                  "${esc(info.learningGoals)}"
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Payment methods card -->
          <div class="rounded-2xl border border-line bg-white p-6 sm:p-7 shadow-sm">
            <h2 class="text-xs font-bold uppercase tracking-wider text-muted mb-4">Choose Payment Method</h2>

            <div class="space-y-3">
              <!-- VNPay Sandbox Option -->
              <label class="payment-method-card flex items-start gap-3.5 p-4 rounded-xl border-2 border-brand bg-lilac/20 cursor-pointer transition-all">
                <input type="radio" name="payment_method" value="VNPAY" checked class="mt-1 h-4 w-4 accent-brand text-brand">
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-bold text-ink">VNPay Gateway (ATM / QR / Credit Card)</span>
                    <span class="rounded-full bg-brand text-white px-2 py-0.5 text-[10px] font-bold">RECOMMENDED</span>
                  </div>
                  <p class="mt-1 text-xs text-muted leading-relaxed">
                    Fast instant checkout. Funds are immediately locked in Escrow and your 7-day trial starts right away.
                  </p>
                </div>
              </label>

              <!-- Bank Transfer Option -->
              <label class="payment-method-card flex items-start gap-3.5 p-4 rounded-xl border border-line hover:border-brand/50 bg-white cursor-pointer transition-all">
                <input type="radio" name="payment_method" value="BANK_TRANSFER" class="mt-1 h-4 w-4 accent-brand text-brand">
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-bold text-ink">Escrow Bank Transfer (MB Bank)</span>
                    <span class="rounded-full bg-lilac text-brand px-2 py-0.5 text-[10px] font-bold">DIRECT QR</span>
                  </div>
                  <p class="mt-1 text-xs text-muted leading-relaxed">
                    Transfer directly to platform escrow account with order code. Verified automatically.
                  </p>
                </div>
              </label>
            </div>

            <!-- Bank Transfer Details (hidden by default) -->
            <div id="bank-details-panel" class="hidden mt-4 p-5 rounded-xl border border-line bg-cream space-y-3 text-xs">
              <div class="flex justify-between items-center py-1 border-b border-line/60">
                <span class="text-muted">Bank Name:</span>
                <span class="font-bold text-ink">${esc(info.bankName || 'MB Bank')}</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-line/60">
                <span class="text-muted">Account Number:</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-ink">${esc(info.accountNumber || '9876543210')}</span>
                  <button type="button" class="copy-btn text-brand font-semibold hover:underline" data-copy="${esc(info.accountNumber || '9876543210')}">Copy</button>
                </div>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-line/60">
                <span class="text-muted">Account Holder:</span>
                <span class="font-bold text-ink">${esc(info.accountName || 'HAPPYPROGRAMMING ESCROW')}</span>
              </div>
              <div class="flex justify-between items-center py-1">
                <span class="text-muted">Transfer Message:</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-brand bg-white px-2 py-0.5 rounded border border-line">${esc(info.transferContent || `HP REQ ${info.requestId}`)}</span>
                  <button type="button" class="copy-btn text-brand font-semibold hover:underline" data-copy="${esc(info.transferContent || `HP REQ ${info.requestId}`)}">Copy</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order Summary and Action (1 col) -->
        <div class="space-y-6 lg:sticky lg:top-8">
          <div class="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 class="text-xs font-bold uppercase tracking-wider text-muted mb-4">Payment Summary</h2>

            <div class="space-y-3 text-sm pb-5 border-b border-line">
              <div class="flex justify-between">
                <span class="text-muted">Monthly Package Fee</span>
                <span class="font-semibold text-ink">${amountFormatted} ${currency}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted">Platform Escrow Protection</span>
                <span class="font-semibold text-emerald-600">Included (Free)</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted">7-Day Money-Back Window</span>
                <span class="font-semibold text-emerald-600">Active</span>
              </div>
            </div>

            <div class="flex justify-between items-baseline pt-4">
              <span class="text-sm font-bold text-ink">Total Due Today</span>
              <div class="text-right">
                <span class="font-display text-2xl font-bold text-brand">${amountFormatted}</span>
                <span class="text-xs font-bold text-brand ml-0.5">${currency}</span>
              </div>
            </div>

            <!-- Escrow guarantee callout -->
            <div class="mt-5 rounded-xl bg-lilac/40 border border-brand/20 p-3.5 text-[11px] leading-relaxed text-ink">
              <div class="flex items-start gap-2">
                <svg class="h-4 w-4 shrink-0 text-brand mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>
                  <strong>Escrow Protection:</strong> Funds are safely secured. The mentor is paid only after your trial period and completed milestones.
                </span>
              </div>
            </div>

            <!-- Payment error container -->
            <div id="checkout-error" class="hidden mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert"></div>

            <!-- Primary Checkout Button -->
            <button
              type="button"
              id="checkout-submit-btn"
              class="btn btn-primary w-full mt-6 py-3.5 text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              Confirm & Pay ${amountFormatted} ${currency}
            </button>

            <p class="mt-3 text-center text-[10px] text-muted flex items-center justify-center gap-1.5">
              <svg class="h-3 w-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>256-bit encrypted · VNPay-backed Escrow</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Payment Method Toggle
  const radios = container.querySelectorAll('input[name="payment_method"]');
  const bankPanel = container.querySelector('#bank-details-panel');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      container.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('border-2', 'border-brand', 'bg-lilac/20');
        card.classList.add('border', 'border-line', 'bg-white');
      });
      const parentLabel = radio.closest('.payment-method-card');
      parentLabel?.classList.remove('border', 'border-line', 'bg-white');
      parentLabel?.classList.add('border-2', 'border-brand', 'bg-lilac/20');

      if (radio.value === 'BANK_TRANSFER') {
        bankPanel?.classList.remove('hidden');
      } else {
        bankPanel?.classList.add('hidden');
      }
    });
  });

  // Bind Copy buttons
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('text-emerald-600');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('text-emerald-600');
        }, 2000);
      } catch (err) {
        console.warn('Could not copy to clipboard:', err);
      }
    });
  });

  // Bind Checkout Submission
  const submitBtn = container.querySelector('#checkout-submit-btn');
  const errorBox = container.querySelector('#checkout-error');

  submitBtn?.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
        Processing Escrow Payment…
      </span>
    `;
    if (errorBox) errorBox.classList.add('hidden');

    const selectedMethod = container.querySelector('input[name="payment_method"]:checked')?.value || 'VNPAY';

    try {
      const response = await mentorshipRequestService.processCheckout(info.requestId, {
        paymentMethod: selectedMethod,
      });

      // Show Payment Success Screen
      renderSuccessScreen(container, info, response);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = `Confirm & Pay ${amountFormatted} ${currency}`;
      if (errorBox) {
        errorBox.textContent = err.message || 'Payment processing failed. Please try again.';
        errorBox.classList.remove('hidden');
      }
    }
  });
}

function renderSuccessScreen(container, info, response) {
  const trialEndStr = response.trialEndsAt
    ? new Date(response.trialEndsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '7 days from today';

  container.innerHTML = `
    <div class="rounded-2xl border border-line bg-white p-8 sm:p-12 text-center shadow-sm max-w-2xl mx-auto">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold shadow-sm">
        ✓
      </div>
      <p class="eyebrow mt-5 text-emerald-600">PAYMENT CONFIRMED · ESCROW ACTIVE</p>
      <h1 class="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">
        Welcome to your mentorship!
      </h1>
      <p class="mt-3 text-sm leading-6 text-muted max-w-md mx-auto">
        Your payment for <strong>${esc(info.packageName || 'Monthly Mentorship')}</strong> with <strong>${esc(info.mentorName)}</strong> was successful. Funds are held safely in Escrow.
      </p>

      <div class="mt-8 rounded-xl bg-cream border border-line p-5 text-left text-xs space-y-2.5">
        <div class="flex justify-between py-1 border-b border-line/60">
          <span class="text-muted">Subscription Status:</span>
          <span class="font-bold text-emerald-600">TRIALING (7-Day Trial Active)</span>
        </div>
        <div class="flex justify-between py-1 border-b border-line/60">
          <span class="text-muted">Trial Expiration:</span>
          <span class="font-bold text-ink">${esc(trialEndStr)}</span>
        </div>
        <div class="flex justify-between py-1 border-b border-line/60">
          <span class="text-muted">Escrow Protection:</span>
          <span class="font-bold text-brand">Held in Escrow (Full protection)</span>
        </div>
        <div class="flex justify-between py-1">
          <span class="text-muted">Amount Paid:</span>
          <span class="font-bold text-ink">${formatVnd(response.amount || info.amount)} ${response.currency || info.currency || 'VND'}</span>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a href="#/account" class="btn btn-primary">Go to My Account</a>
        <a href="#/notifications" class="btn btn-outline">Notification History</a>
      </div>
    </div>
  `;
}
