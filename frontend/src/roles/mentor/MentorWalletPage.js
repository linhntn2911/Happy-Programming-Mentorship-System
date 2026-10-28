import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorWalletService } from './mentorWalletService.js';
import { escapeHtml as e } from '../../shared/html.js';

const money = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0)) + ' VND';
const dateTime = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

function walletContent() {
  return `
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">MENTOR WALLET &amp; EARNINGS</p><h1>Wallet and earnings</h1><p>Verified payments are held for seven days before becoming available to withdraw.</p></div></div>
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
    <dialog id="payout-otp-dialog" class="modal" aria-labelledby="payout-otp-title">
      <button class="modal-close" id="payout-otp-close" type="button" aria-label="Close"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      <div class="space-y-6 py-2">
        <div class="text-center space-y-2">
          <div class="mx-auto w-12 h-12 rounded-2xl bg-lilac text-brand grid place-items-center mb-3">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h2 id="payout-otp-title" class="text-xl font-semibold text-ink">Enter your verification code</h2>
          <p id="payout-otp-summary" class="text-sm text-muted leading-6"></p>
        </div>
        <form id="payout-otp-form" class="auth-form space-y-4" novalidate>
          <div class="auth-field space-y-2">
            <label for="payout-otp-input" class="block text-xs font-semibold text-ink text-center">Enter 6-digit code</label>
            <input type="text" id="payout-otp-input" name="otp" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" placeholder="••••••" required autofocus class="auth-otp-input">
          </div>
          <p id="payout-otp-message" class="auth-feedback" role="alert" hidden></p>
          <button id="payout-otp-confirm" class="auth-submit btn btn-primary w-full" type="submit">Confirm withdrawal</button>
          <div class="text-center pt-2">
            <p class="text-xs text-muted">
              Didn't receive the email?
              <button type="button" id="payout-otp-resend" class="auth-link font-medium inline-block ml-1">Resend code</button>
            </p>
          </div>
        </form>
      </div>
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
  return `<div class="data-table-scroll"><table class="data-table"><thead><tr><th>Requested</th><th>Amount</th><th>Destination</th><th>Status</th><th>Transfer / note</th></tr></thead><tbody>${requests.map(item => `<tr><td>${e(dateTime(item.requestedAt))}</td><td>${money(item.amount)}</td><td>${e(item.bankName)} ···· ${e(item.accountLast4)}</td><td>${e(item.status)}</td><td>${e(item.transferReference || item.rejectionReason || '—')}</td></tr>`).join('')}</tbody></table></div>`;
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

  let currentWallet = null;
  let savedBank = null;
  let pendingAmount = 0;
  let toastTimer;
  let disposed = false;

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
    const ready = Boolean(savedBank?.saved) && available >= 1;
    payoutForm.elements.amount.max = String(available);
    payoutForm.elements.amount.placeholder = `Up to ${money(available)}`;
    payoutSubmit.disabled = !ready;
  }

  async function load() {
    loading.hidden = false; error.hidden = true; retry.hidden = true; content.hidden = true;
    try {
      const [wallet, bank] = await Promise.all([
        mentorWalletService.getWallet(),
        mentorWalletService.getBankAccount().catch(() => ({ saved: false })),
      ]);
      if (disposed) return;
      currentWallet = wallet;
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
    otpMessage.hidden = true;
    otpInput.value = '';
    otpConfirm.disabled = false; otpConfirm.textContent = 'Confirm withdrawal';
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    otpInput.focus();
  }

  function otpSummaryText(amount) {
    return `We sent a 6-digit code to ${savedBank?.maskedEmail || 'your email'}. Confirming withdraws ${money(amount)} to ${destinationLabel()}. The code expires in 10 minutes.`;
  }

  async function continuePayout(event) {
    event.preventDefault(); payoutMessage.textContent = '';
    if (!payoutForm.reportValidity()) return;
    if (!savedBank?.saved) { payoutMessage.textContent = 'Save your bank account first.'; return; }
    const amount = Number(payoutForm.elements.amount.value);
    const available = Number(currentWallet?.availableAmount || 0);
    if (!amount || amount <= 0 || amount > available) {
      payoutMessage.textContent = `Amount must be greater than 0 and cannot exceed your available balance (${money(available)}).`;
      return;
    }
    payoutSubmit.disabled = true; payoutSubmit.textContent = 'Sending code…';
    try {
      const result = await mentorWalletService.requestPayoutOtp(amount);
      pendingAmount = amount;
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
    event.preventDefault(); otpMessage.textContent = ''; otpMessage.hidden = true;
    const otp = (otpInput.value || '').trim();
    if (!/^\d{6}$/.test(otp)) { otpMessage.textContent = 'Enter the 6-digit code from your email.'; otpMessage.hidden = false; return; }
    otpConfirm.disabled = true; otpResend.disabled = true; otpConfirm.textContent = 'Submitting…';
    try {
      await mentorWalletService.requestPayout({ amount: pendingAmount, otp });
      dialog.close();
      payoutForm.reset();
      showToast('Payout request submitted. Funds are now reserved.');
      await load();
    } catch (submitError) {
      otpMessage.textContent = submitError.message || 'Unable to submit the payout request.';
      otpMessage.hidden = false;
    } finally {
      otpConfirm.disabled = false; otpResend.disabled = false; otpConfirm.textContent = 'Confirm withdrawal';
    }
  }

  async function resendOtp() {
    if (!pendingAmount) return;
    otpResend.disabled = true; otpMessage.textContent = ''; otpMessage.hidden = true;
    try {
      await mentorWalletService.requestPayoutOtp(pendingAmount);
      otpMessage.textContent = 'A new code is on its way.';
      otpMessage.hidden = false;
    } catch (resendError) {
      otpMessage.textContent = resendError.message || 'Unable to resend the code.';
      otpMessage.hidden = false;
    } finally { otpResend.disabled = false; }
  }

  const closeDialog = () => dialog.close();

  retry.addEventListener('click', load);
  bankForm.addEventListener('submit', saveBank);
  payoutForm.addEventListener('submit', continuePayout);
  otpForm.addEventListener('submit', confirmPayout);
  otpResend.addEventListener('click', resendOtp);
  otpClose.addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  void load();

  return () => {
    disposed = true;
    clearTimeout(toastTimer);
    retry.removeEventListener('click', load);
    bankForm.removeEventListener('submit', saveBank);
    payoutForm.removeEventListener('submit', continuePayout);
    otpForm.removeEventListener('submit', confirmPayout);
    otpResend.removeEventListener('click', resendOtp);
    otpClose.removeEventListener('click', closeDialog);
    if (dialog.open) dialog.close();
    unbind();
  };
}
