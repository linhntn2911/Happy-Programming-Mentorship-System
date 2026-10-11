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
  const hasPaymentReference = paymentStatus === 'PENDING' && Boolean(info.paymentReference);

  if (isPaid) {
    container.innerHTML = `<div class="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm sm:p-12">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">✓</span>
      <span class="eyebrow mt-5 inline-block text-emerald-600">PAYMENT CONFIRMED · ESCROW ACTIVE</span>
      <h1 class="mt-2 font-display text-3xl font-bold text-ink">Your mentorship is active</h1>
      <p class="mt-3 text-sm leading-6 text-muted">Your payment for <strong>${esc(info.packageName)}</strong> with <strong>${esc(info.mentorName)}</strong> was verified by VNPay and placed in escrow.</p>
      <div class="mt-7 rounded-xl border border-line bg-cream p-5 text-left text-sm">
        <div class="flex justify-between gap-4"><span class="text-muted">Amount paid</span><strong>${amountFormatted} ${esc(currency)}</strong></div>
        <div class="mt-3 flex justify-between gap-4"><span class="text-muted">Payment state</span><strong class="text-emerald-700">Verified</strong></div>
      </div>
      <a href="#/applications" class="btn btn-primary mt-7">View my applications</a>
    </div>`;
    return;
  }

  if (!isAccepted) {
    container.innerHTML = `<div class="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
      <span class="eyebrow text-amber-700">APPLICATION: ${esc(info.status)}</span>
      <h1 class="mt-2 font-display text-2xl font-bold text-ink">Payment is unavailable</h1>
      <p class="mt-2 text-sm leading-6 text-muted">The mentor must accept this application before checkout can begin.</p>
      <a href="#/applications" class="btn btn-primary mt-6">My applications</a>
    </div>`;
    return;
  }

  const failed = paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED';
  const pendingReturn = paymentReturn && paymentStatus === 'PENDING';
  const mentorInitials = getInitials(info.mentorName || 'Mentor');
  const avatarHtml = info.mentorAvatarUrl
    ? `<img src="${esc(info.mentorAvatarUrl)}" alt="${esc(info.mentorName)}" class="h-14 w-14 rounded-full border border-line object-cover">`
    : `<div class="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-bold uppercase text-white">${esc(mentorInitials)}</div>`;

  container.innerHTML = `<div>
    <a href="#/applications" class="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">← Back to my applications</a>
    <div class="mb-8">
      <p class="eyebrow">SECURE VNPAY CHECKOUT</p>
      <h1 class="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">Review your mentorship</h1>
      <p class="mt-2 text-sm text-muted">Confirm the package and amount, then complete payment on VNPay. Your mentorship activates after the server verifies the payment.</p>
    </div>
    ${pendingReturn ? `<div class="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900" role="status">
      <strong>Payment confirmation is processing.</strong> We are waiting for VNPay's secure confirmation. Returning from the payment page does not itself confirm payment.
      <div class="mt-2"><button id="checkout-refresh-btn" type="button" class="font-semibold underline">Check status again</button></div>
    </div>` : ''}
    ${failed ? `<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      Your previous VNPay attempt ${paymentStatus === 'FAILED' ? 'was not completed' : 'expired'}. The application is still accepted; you can start a new payment attempt.
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
        <section class="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7" aria-labelledby="checkout-method-heading">
          <h2 id="checkout-method-heading" class="text-xs font-bold uppercase tracking-wider text-muted">Payment method</h2>
          <div class="mt-4 flex items-center gap-4 rounded-xl border-2 border-brand bg-lilac/20 p-4">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white font-bold text-brand">V</span>
            <div><p class="font-bold text-ink">VNPay QR</p><p class="mt-1 text-xs text-muted">VNPay will display its payment QR on the secure payment page.</p></div>
          </div>
          <p class="mt-4 text-xs leading-5 text-muted">A unique payment reference is attached to each attempt for reconciliation. HappyProgramming does not receive or store your bank credentials.</p>
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
          ${info.paymentExpiresAt && paymentStatus === 'PENDING' ? `<p class="mt-3 text-xs text-muted">Current payment attempt expires ${esc(formatDate(info.paymentExpiresAt))}.</p>` : ''}
          <div id="checkout-reference-slot" class="mt-4">${hasPaymentReference ? paymentReferenceHtml(info.paymentReference) : ''}</div>
          ${priceAvailable ? '' : '<p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="alert">We could not verify the price accepted for this application because the mentor’s package changed after you applied. Please ask the mentor to confirm the package before paying.</p>'}
          <div id="checkout-error" class="mt-4 hidden rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert"></div>
          <button type="button" id="checkout-submit-btn" class="btn btn-primary mt-6 w-full py-3.5 text-sm font-semibold" ${pendingReturn || !priceAvailable ? 'disabled' : ''}>
            ${!priceAvailable ? 'Payment unavailable' : pendingReturn ? 'Waiting for VNPay confirmation' : hasPaymentReference ? 'Continue to VNPay QR' : 'Prepare VNPay QR payment'}
          </button>
          ${pendingReturn ? '<button type="button" id="checkout-retry-payment-btn" class="btn btn-outline mt-3 w-full">Return to payment</button>' : ''}
          <p class="mt-3 text-center text-[11px] text-muted">Only a verified VNPay notification confirms payment and activates your mentorship.</p>
        </section>
      </aside>
    </div>
  </div>`;

  const refresh = () => mountCheckout(root, info.requestId, true);
  container.querySelector('#checkout-refresh-btn')?.addEventListener('click', refresh);
  container.querySelector('#checkout-retry-payment-btn')?.addEventListener('click', () => startVnPay(container, info));
  container.querySelector('#checkout-submit-btn')?.addEventListener('click', () => startVnPay(container, info));
  bindPaymentReferenceCopy(container);
}

function paymentReferenceHtml(reference) {
  return `<div class="rounded-xl border border-line bg-lilac/30 p-3" aria-label="Payment reference">
    <p class="text-xs font-semibold text-muted">VNPay payment reference</p>
    <div class="mt-1 flex items-center justify-between gap-2">
      <code class="break-all text-sm font-bold tracking-wide text-ink">${esc(reference)}</code>
      <button type="button" data-copy-payment-reference class="shrink-0 text-xs font-semibold text-brand underline">Copy</button>
    </div>
    <p class="mt-2 text-[11px] leading-4 text-muted">This unique code is sent as the VNPay order reference. Scan the QR on the next page to pay.</p>
  </div>`;
}

function bindPaymentReferenceCopy(container) {
  container.querySelector('[data-copy-payment-reference]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const reference = container.querySelector('#checkout-reference-slot code')?.textContent;
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    } catch {
      button.textContent = 'Select code to copy';
    }
  });
}

async function startVnPay(container, info) {
  const button = container.querySelector('#checkout-submit-btn');
  const errorBox = container.querySelector('#checkout-error');
  if (!button) return;
  button.disabled = true;
  button.textContent = 'Preparing VNPay QR payment…';
  errorBox?.classList.add('hidden');
  try {
    const response = await mentorshipRequestService.processCheckout(info.requestId);
    if (!response?.paymentUrl || !response.paymentReference || response.status !== 'PENDING') {
      throw new Error('VNPay did not return a payment reference and checkout URL.');
    }
    window.location.assign(response.paymentUrl);
  } catch (err) {
    button.disabled = false;
    button.textContent = info.paymentReference ? 'Continue to VNPay QR' : 'Prepare VNPay QR payment';
    if (errorBox) {
      errorBox.textContent = err.message || 'Could not start VNPay checkout. Please try again.';
      errorBox.classList.remove('hidden');
    }
  }
}
