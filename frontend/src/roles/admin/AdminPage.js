import { AdminLayout, adminSections } from './AdminLayout.js';
import { OperationsView } from './OperationsView.js';
import { Button } from '../../shared/Button.js';
import { Dialog } from '../../shared/Dialog.js';
import { Notice } from './AdminPrimitives.js';
import { adminService } from './adminService.js';
import { escapeHtml as e } from '../../shared/html.js';
import { PERMISSIONS, paymentCommission, revenue } from './admin.js';
import { OverviewView, UsersView, RevenueView, PayoutsView, RefundsView, SettingsView, AuditView } from './AdminViews.js';
import { TransferQrPanel } from './TransferQrPanel.js';

let service = adminService;
export function mountAdmin(root, section = 'overview') {
  document.title = 'Admin workspace | HappyProgramming';
  service = adminService;
  try { window.sessionStorage.removeItem('hpms.admin.mode'); } catch { /* optional storage */ }
  let disposed = false;
  let requestVersion = 0;
  let session;
  let data;
  let payoutRequests = [];
  let refundRequests = [];
  let message = '';
  let activeDialog;
  const state = { query: '', role: '', status: '', page: 1, from: '', to: '' };
  const alive = () => !disposed;
  const on = (selector, event, handler) => root.querySelector(selector)?.addEventListener(event, handler);
  const renderShell = content => {
    if (!alive()) return;
    root.innerHTML = AdminLayout(section, content, { ...session, authenticated: Boolean(session) });
    on('#admin-menu', 'click', event => {
      const open = root.querySelector('.admin-sidebar').classList.toggle('menu-open');
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });
    on('.admin-skip', 'click', event => { event.preventDefault(); root.querySelector('#admin-content').focus(); });
  };
  async function load() {
    const version = ++requestVersion;
    renderShell(Notice({ message: 'Loading your admin workspace…' }));
    try {
      const currentSession = await service.session();
      const result = await service.workspace();
      if (section === 'settings') result.operations = await service.operations();
      let pendingPayouts = section === 'payouts' ? await service.payoutRequests() : [];
      if (section === 'payouts') {
        const history = await service.payoutHistory();
        const pending = new Map(pendingPayouts.map(item => [item.id, item]));
        pendingPayouts = history.map(item => ({ ...item, ...(item.status === 'APPROVED' ? pending.get(item.id) : {}) }));
      }
      let pendingRefunds = section === 'refunds' ? await service.refundRequests() : [];
      if (section === 'refunds') {
        const history = await service.refundHistory();
        const pending = new Map(pendingRefunds.map(item => [item.id, item]));
        pendingRefunds = history.map(item => ({ ...item, ...(item.status === 'APPROVED' ? pending.get(item.id) : {}) }));
      }
      if (!alive() || version !== requestVersion) return;
      session = currentSession; data = result; payoutRequests = pendingPayouts; refundRequests = pendingRefunds; render();
    } catch (err) {
      if (!alive() || version !== requestVersion) return;
      if (err.status === 401 || err.status === 403) window.location.hash = '#/login';
      else {
        renderShell(`${Notice({ message: err.message || 'Unable to load the workspace.', type: 'error' })}<div class="admin-actions">${Button({ id: 'admin-retry', label: 'Try again' })}</div>`);
        on('#admin-retry', 'click', load);
      }
    }
  }
  function render() {
    if (!alive()) return;
    const views = { overview: () => OverviewView(data, session), users: () => UsersView(data, state), staff: () => UsersView(data, state, true), revenue: () => RevenueView(data, state), payouts: () => PayoutsView(payoutRequests, false, state), refunds: () => RefundsView(refundRequests, false, state), settings: () => SettingsView(data), audit: () => AuditView(data, state) };
    const content = Object.hasOwn(adminSections, section) ? views[section]() : '<h1 class="section-title">Page not found</h1><a class="btn btn-primary mt-5" href="#/admin">Back to overview</a>';
    renderShell(`<p class="text-[11px] text-muted mb-5">Administrator workspace · Live data</p>${service.warning ? Notice({ message: service.warning }) : ''}${message ? Notice({ message }) : ''}${content}`);
    on('#admin-logout', 'click', async event => {
      event.currentTarget.disabled = true;
      try { await service.logout(); session = undefined; data = undefined; if (alive()) window.location.hash = '#/login'; }
      catch (err) { message = err.message; render(); }
    });
    on('#admin-filters', 'submit', event => { event.preventDefault(); Object.assign(state, Object.fromEntries(new FormData(event.currentTarget)), { page: 1 }); render(); root.querySelector('#admin-query')?.focus(); });
    for (const id of ['role', 'status']) on(`#${id}`, 'change', () => root.querySelector('#admin-filters').requestSubmit());
    on('#admin-clear', 'click', () => { Object.assign(state, { query: '', role: '', status: '', page: 1, from: '', to: '' }); render(); });
    on('#admin-prev', 'click', () => { state.page--; render(); root.querySelector('#admin-next')?.focus(); });
    on('#admin-next', 'click', () => { state.page++; render(); root.querySelector('#admin-prev')?.focus(); });
    root.querySelectorAll('[data-admin-page-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = Number(btn.dataset.adminPageJump);
        if (!Number.isNaN(target) && target !== state.page) {
          state.page = target;
          render();
        }
      });
    });
    on('#admin-page-select', 'change', event => {
      const target = Number(event.currentTarget.value);
      if (!Number.isNaN(target) && target !== state.page) {
        state.page = target;
        render();
      }
    });
    on('#admin-dates', 'submit', event => {
      event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
      form.elements.to.setCustomValidity(values.from && values.to && values.to < values.from ? 'End date must be on or after the start date.' : '');
      if (!form.reportValidity()) return;
      Object.assign(state, values, { page: 1 }); render();
    });
    on('#to', 'input', event => event.currentTarget.setCustomValidity(''));
    on('#from', 'input', () => { root.querySelector('#to').setCustomValidity(''); });
    on('#admin-export', 'click', exportCsv);
    root.querySelectorAll('[data-user]').forEach(button => button.addEventListener('click', () => accountDialog(Number(button.dataset.user), false)));
    root.querySelectorAll('[data-permissions]').forEach(button => button.addEventListener('click', () => accountDialog(Number(button.dataset.permissions), true)));
    root.querySelectorAll('[data-payout-paid]').forEach(button => button.addEventListener('click', () => {
      const id = Number(button.dataset.payoutPaid);
      const payout = payoutRequests.find(item => Number(item.id) === id);
      const content = TransferQrPanel({
        recipientLabel: 'Mentor',
        recipientName: payout?.mentorName || 'Mentor',
        recipientEmail: payout?.mentorEmail || '',
        amount: payout?.amount || 0,
        feeAmount: payout?.feeAmount || 0,
        netAmount: payout?.netAmount ?? payout?.amount ?? 0,
        bankName: payout?.bankName || '',
        accountNumber: payout?.accountNumber || '',
        accountName: payout?.accountName || payout?.mentorName || '',
        referenceCode: `#${payout?.id || id}`,
        memoPrefix: 'PAYOUT',
        contextNote: 'Confirm that the bank transfer has already been completed. Enter its transaction reference and attach the receipt before posting the debit to the wallet ledger.',
        showReceiptUpload: true,
        receiptRecipient: 'mentor'
      });
      openDialog('Record mentor payout', content, form => {
        const transferReference = form.elements.transferReference.value.trim();
        if (!transferReference) throw new Error('Enter the bank transfer reference.');
        if (!form.__receiptBase64) throw new Error('Upload the bank transfer receipt.');
        return service.decidePayout(id, {
          decision: 'PAID',
          transferReference,
          receiptFileName: form.__receiptFileName || null,
          receiptBase64: form.__receiptBase64,
          receiptMimeType: form.__receiptMimeType || null
        });
      });
    }));
    root.querySelectorAll('[data-payout-reject]').forEach(button => button.addEventListener('click', () => {
      const id = Number(button.dataset.payoutReject);
      openDialog('Reject payout request', '<p>The reserved amount will return to the mentor’s available balance.</p><label class="admin-field mt-4">Reason<textarea name="reason" rows="3" maxlength="500" required></textarea></label>', form => service.decidePayout(id, { decision: 'REJECTED', rejectionReason: form.elements.reason.value.trim() }));
    }));
    root.querySelectorAll('[data-refund-paid]').forEach(button => button.addEventListener('click', () => {
      const id = Number(button.dataset.refundPaid);
      const refund = refundRequests.find(item => Number(item.id) === id);
      const content = TransferQrPanel({
        recipientLabel: 'Mentee',
        recipientName: refund?.complainantName || refund?.menteeName || 'Mentee',
        recipientEmail: refund?.complainantEmail || '',
        amount: refund?.refundAmount || 0,
        bankName: refund?.bankName || '',
        accountNumber: refund?.accountNumber || '',
        accountName: refund?.accountName || refund?.complainantName || refund?.menteeName || '',
        referenceCode: refund?.ticketCode || String(id),
        memoPrefix: 'REFUND',
        contextNote: 'Confirm that the bank transfer has been made to the mentee. Enter the external bank transfer reference to complete the refund and record the escrow release debit.',
        showReceiptUpload: true,
        receiptRecipient: 'mentee'
      });
      openDialog('Process mentee refund', content, form => {
        const transferReference = form.elements.transferReference.value.trim();
        if (!transferReference) throw new Error('Enter the bank transfer reference.');
        return service.decideRefund(id, {
          decision: 'PAID',
          transferReference,
          receiptFileName: form.__receiptFileName || null,
          receiptBase64: form.__receiptBase64 || null,
          receiptMimeType: form.__receiptMimeType || null
        });
      });
    }));
    root.querySelectorAll('[data-refund-reject]').forEach(button => button.addEventListener('click', () => {
      const id = Number(button.dataset.refundReject);
      openDialog('Reject refund proposal', '<p>Rejecting will cancel the staff-approved refund and restore the underlying booking/subscription.</p><label class="admin-field mt-4">Rejection reason<textarea name="reason" rows="3" maxlength="500" required placeholder="Reason for rejecting this refund"></textarea></label>', form => service.decideRefund(id, { decision: 'REJECTED', rejectionReason: form.elements.reason.value.trim() }));
    }));
    if (section === 'settings' && data.operations) {
      root.querySelector('#admin-content')?.insertAdjacentHTML('beforeend', OperationsView(data.operations));
      on('#admin-operations', 'submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        const settings = { maintenance: values.maintenance === 'on', announcement: values.announcement.trim() };
        for (const key of ['otpResendSeconds','otpExpiryMinutes','withdrawalThreshold','earningsHoldDays']) settings[key] = Number(values[key]);
        settings.withdrawalFee = 0;
        openDialog('Review operational changes', `<p>Maintenance: <strong>${settings.maintenance ? 'Enabled — members will be blocked' : 'Disabled'}</strong></p><p class="mt-3">Announcement: ${e(settings.announcement || 'Hidden')}</p><p class="mt-3">OTP: resend after ${settings.otpResendSeconds}s; valid for ${settings.otpExpiryMinutes} minutes.</p><p>Withdrawals above ${settings.withdrawalThreshold} VND (free of fee).</p><p>Hold for new payments: ${settings.earningsHoldDays} days.</p><p class="mt-3">${e(values.reason)}</p>`, () => service.updateOperations({ settings, reason: values.reason }));
      });
    }
    on('#admin-settings-reset', 'click', render);
    on('#admin-settings', 'submit', event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.commissionRate = Number(values.commissionRate); values.supportEmail = values.supportEmail.trim();
      if (!values.reason.trim()) { event.currentTarget.elements.reason.setCustomValidity('Provide a reason for this change.'); event.currentTarget.reportValidity(); return; }
      openDialog('Review configuration changes', `<p>Platform commission: <strong>${e(data.settings.commissionRate)}% → ${e(values.commissionRate)}%</strong></p><p>Support email: <strong>${e(values.supportEmail || 'Not configured')}</strong></p><p class="mt-3">${e(values.reason)}</p><p class="mt-3">Existing payment commission rates will remain unchanged.</p>`, () => service.settings(values));
    });
    on('#settings-reason', 'input', event => event.currentTarget.setCustomValidity(''));
  }
  function accountDialog(id, permissions) {
    const user = data.users.find(u => u.id === id);
    if (!user) return;
    const protectedAccount = user.role === 'ADMIN';
    const fields = permissions
      ? `<fieldset class="admin-form"><legend class="font-semibold mb-3">Assigned permissions</legend>${Object.entries(PERMISSIONS).map(([key, label]) => `<label class="admin-check"><input type="checkbox" name="permissions" value="${key}" ${user.permissions.includes(key) ? 'checked' : ''}><span>${e(label)}</span></label>`).join('')}</fieldset>`
      : `<label class="admin-field" for="account-status">Account status<select name="status" id="account-status" ${protectedAccount ? 'disabled' : ''}>${['ACTIVE', 'INACTIVE', 'LOCKED'].map(s => `<option ${s === user.status ? 'selected' : ''} value="${s}">${s.charAt(0) + s.slice(1).toLowerCase()}</option>`).join('')}</select></label>`;
    openDialog(permissions ? 'Edit staff permissions' : 'Account details', `<p class="font-semibold text-ink">${e(user.name)}</p><p>${e(user.email)} · ${e(user.role)}</p><div class="admin-form mt-5">${fields}${protectedAccount ? Notice({ message: 'Administrator accounts are protected and cannot be modified here.' }) : '<label class="admin-field" for="change-reason">Reason for change<textarea id="change-reason" name="reason" required maxlength="1000" rows="3" placeholder="Explain this account change"></textarea></label>'}</div>`, protectedAccount ? null : form => {
      const values = new FormData(form); const change = { reason: values.get('reason') };
      return permissions ? service.permissions(id, { ...change, permissions: values.getAll('permissions') }) : service.status(id, { ...change, status: values.get('status') });
    });
  }
  function openDialog(title, content, action) {
    const trigger = document.activeElement;
    const triggerUser = trigger?.getAttribute('data-user'); const triggerStaff = trigger?.getAttribute('data-permissions');
    const host = document.createElement('div');
    host.innerHTML = Dialog({ id: 'admin-dialog', title: e(title), eyebrow: 'ADMINISTRATION', content: `<form id="admin-change-form">${content}<div id="admin-dialog-error" class="mt-4"></div><div class="admin-actions">${Button({ label: action ? 'Cancel' : 'Close', variant: 'outline', id: 'admin-cancel' })}${action ? Button({ label: 'Confirm changes', type: 'submit', id: 'admin-confirm' }) : ''}</div></form>` });
    root.append(host); const dialog = host.querySelector('dialog'); activeDialog = dialog;
    host.querySelectorAll('[data-close], #admin-cancel').forEach(button => button.addEventListener('click', () => dialog.close()));
    const formElement = host.querySelector('form');
    const receiptInput = host.querySelector('#admin-receipt-file');
    const previewContainer = host.querySelector('#receipt-preview-container');
    const previewImg = host.querySelector('#receipt-preview-img');
    const removeBtn = host.querySelector('#receipt-remove-btn');
    if (receiptInput) {
      receiptInput.addEventListener('change', () => {
        const file = receiptInput.files?.[0];
        if (!file) {
          if (formElement) { formElement.__receiptBase64 = null; formElement.__receiptFileName = null; formElement.__receiptMimeType = null; }
          previewContainer?.classList.add('hidden');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          window.alert('Receipt image must be 5 MB or smaller.');
          receiptInput.value = '';
          return;
        }
        if (formElement) { formElement.__receiptFileName = file.name; formElement.__receiptMimeType = file.type; }
        const reader = new FileReader();
        reader.onload = ev => {
          if (formElement) formElement.__receiptBase64 = ev.target.result;
          if (previewImg) previewImg.src = ev.target.result;
          previewContainer?.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (receiptInput) receiptInput.value = '';
        if (formElement) { formElement.__receiptBase64 = null; formElement.__receiptFileName = null; formElement.__receiptMimeType = null; }
        previewContainer?.classList.add('hidden');
        if (previewImg) previewImg.src = '';
      });
    }
    host.querySelectorAll('[data-copy-text]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = btn.getAttribute('data-copy-text');
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const temp = document.createElement('textarea');
          temp.value = text;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          temp.remove();
        }
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('text-brand', 'font-bold');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('text-brand', 'font-bold');
        }, 1500);
      });
    });
    dialog.addEventListener('close', () => { host.remove(); activeDialog = undefined; if (trigger?.isConnected) trigger.focus(); else if (alive()) root.querySelector(triggerUser ? `[data-user="${triggerUser}"]` : triggerStaff ? `[data-permissions="${triggerStaff}"]` : '#admin-content')?.focus(); });
    dialog.showModal();
    let busy = false;
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    host.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); if (busy || !action) return;
      const form = event.currentTarget;
      if (form.elements.reason && !form.elements.reason.value.trim()) { form.elements.reason.setCustomValidity('Provide a reason for this change.'); form.reportValidity(); return; }
      busy = true; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        await action(form);
        // A committed mutation must never be offered for retry if refreshing fails.
        if (!alive()) return;
        dialog.close(); message = 'Changes saved successfully. The audit history has been updated.';
        await load();
      } catch (err) {
        if (!alive()) return;
        host.querySelector('#admin-dialog-error').innerHTML = Notice({ message: err.message, type: 'error' });
        busy = false; host.querySelectorAll('button').forEach(b => { b.disabled = false; });
      }
    });
    host.querySelector('[name="reason"]')?.addEventListener('input', event => event.currentTarget.setCustomValidity(''));
  }
  function exportCsv() {
    const quote = value => '"' + String(value).replace(/^[=+@-]/, char => "'" + char).replaceAll('"', '""') + '"';
    const rows = [['Reference', 'Paid at (UTC)', 'Gross VND', 'Commission VND', 'Rate %'], ...revenue(data.payments, state.from, state.to).payments.map(p => [p.reference, p.paidAt, p.amount, paymentCommission(p), p.commissionRate])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'happyprogramming-revenue.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  load();
  return () => { disposed = true; requestVersion++; activeDialog?.close(); };
}
