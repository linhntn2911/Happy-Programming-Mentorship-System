import { MentorLayout, bindMentorLayout } from './MentorLayout.js';
import { authService } from '../auth/authService.js';
import { mentorWalletService } from './mentorWalletService.js';
import { escapeHtml as e } from '../../shared/html.js';

const money = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0)) + ' VND';
const dateTime = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—';

function walletContent() {
  return `
    <div class="admin-page-heading"><div><p class="eyebrow mb-3">MENTOR EARNINGS</p><h1>Wallet and payouts</h1><p>Verified payments are held for seven days before becoming available to withdraw.</p></div></div>
    <div id="wallet-loading" class="admin-panel admin-panel-body text-sm text-muted" role="status">Loading your wallet…</div>
    <div id="wallet-error" class="admin-notice notice-error mb-5" role="alert" hidden></div>
    <button id="wallet-retry" class="btn btn-outline mb-5" type="button" hidden>Try again</button>
    <div id="wallet-content" hidden>
      <div id="wallet-stats" class="admin-stats"></div>
      <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
        <section class="admin-panel" aria-labelledby="wallet-history-title">
          <div class="admin-panel-heading"><div><p class="eyebrow mb-2">ACCOUNTING</p><h2 id="wallet-history-title">Wallet activity</h2><p>Each release and payout is recorded in the payment ledger.</p></div></div>
          <div id="wallet-entries" class="admin-panel-body"></div>
        </section>
        <section class="admin-panel" aria-labelledby="payout-form-title">
          <div class="admin-panel-heading"><div><p class="eyebrow mb-2">WITHDRAWAL</p><h2 id="payout-form-title">Request a payout</h2><p>Requests reserve available balance until the admin records payment or rejection.</p></div></div>
          <div class="admin-panel-body">
            <p id="payout-message" class="mb-4 text-sm" role="status" aria-live="polite"></p>
            <form id="payout-form" class="space-y-4" novalidate>
              <label class="admin-field">Amount (VND)<input class="w-full" name="amount" type="number" min="1" step="1" required></label>
              <label class="admin-field">Bank name<input class="w-full" name="bankName" maxlength="100" required></label>
              <label class="admin-field">Account holder name<input class="w-full" name="accountName" maxlength="150" required></label>
              <label class="admin-field">Account number<input class="w-full" name="accountNumber" inputmode="numeric" pattern="[0-9]{6,34}" minlength="6" maxlength="34" autocomplete="off" required></label>
              <p class="text-xs leading-5 text-muted">Bank account numbers are encrypted before storage. Verify the details carefully; transfers are performed manually by HappyProgramming staff.</p>
              <button id="payout-submit" class="btn btn-primary" type="submit">Submit payout request</button>
            </form>
          </div>
        </section>
      </div>
      <section class="admin-panel mt-5" aria-labelledby="payout-history-title">
        <div class="admin-panel-heading"><div><p class="eyebrow mb-2">HISTORY</p><h2 id="payout-history-title">Payout requests</h2></div></div>
        <div id="payout-history" class="admin-panel-body"></div>
      </section>
    </div>`;
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
  const form = shell.querySelector('#payout-form');
  const submit = shell.querySelector('#payout-submit');
  const message = shell.querySelector('#payout-message');
  let disposed = false;

  async function load() {
    loading.hidden = false; error.hidden = true; retry.hidden = true; content.hidden = true;
    try {
      const wallet = await mentorWalletService.getWallet();
      if (disposed) return;
      shell.querySelector('#wallet-stats').innerHTML = renderStats(wallet);
      shell.querySelector('#wallet-entries').innerHTML = renderEntries(wallet.entries);
      shell.querySelector('#payout-history').innerHTML = renderPayouts(wallet.payoutRequests);
      form.elements.amount.max = String(Number(wallet.availableAmount || 0));
      form.elements.amount.placeholder = `Up to ${money(wallet.availableAmount)}`;
      submit.disabled = Number(wallet.availableAmount || 0) < 1;
      content.hidden = false;
    } catch (loadError) {
      if (disposed) return;
      error.textContent = loadError.message || 'Unable to load the mentor wallet.';
      error.hidden = false; retry.hidden = false;
    } finally { if (!disposed) loading.hidden = true; }
  }

  async function requestPayout(event) {
    event.preventDefault(); message.textContent = '';
    if (!form.reportValidity()) return;
    submit.disabled = true; submit.textContent = 'Submitting…';
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.amount = Number(payload.amount);
      await mentorWalletService.requestPayout(payload);
      form.reset(); message.textContent = 'Your payout request is queued for admin review.';
      await load();
    } catch (submitError) {
      message.textContent = submitError.message || 'Unable to submit the payout request.';
    } finally { submit.disabled = false; submit.textContent = 'Submit payout request'; }
  }

  retry.addEventListener('click', load); form.addEventListener('submit', requestPayout); void load();
  return () => { disposed = true; retry.removeEventListener('click', load); form.removeEventListener('submit', requestPayout); unbind(); };
}
