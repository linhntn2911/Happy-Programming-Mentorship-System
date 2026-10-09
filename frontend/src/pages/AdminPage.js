import { AdminLayout, adminSections } from '../components/layout/AdminLayout.js';
import { Button } from '../components/ui/Button.js';
import { Dialog } from '../components/ui/Dialog.js';
import { Notice } from '../components/ui/AdminPrimitives.js';
import { adminService } from '../services/adminService.js';
import { createDemoService } from '../services/adminDemo.js';
import { escapeHtml as e } from '../utils/html.js';
import { PERMISSIONS, revenue } from '../utils/admin.js';
import { OverviewView, UsersView, RevenueView, SettingsView, AuditView } from './AdminViews.js';

let service = adminService;
function enterDemo() {
  let storage;
  try { storage = window.localStorage; window.sessionStorage.setItem('hpms.admin.mode', 'demo'); } catch { /* in-memory demo still works */ }
  service = createDemoService(storage);
}
try { if (window.sessionStorage.getItem('hpms.admin.mode') === 'demo') enterDemo(); } catch { /* browser storage is optional */ }
export function mountAdmin(root, section = 'overview') {
  document.title = 'Admin workspace | HappyProgramming';
  service = adminService;
  try { if (window.sessionStorage.getItem('hpms.admin.mode') === 'demo') enterDemo(); } catch { /* optional storage */ }
  let disposed = false;
  let requestVersion = 0;
  let session;
  let data;
  let message = '';
  let activeDialog;
  const state = { query: '', role: '', status: '', page: 1, from: '', to: '' };
  const alive = () => !disposed;
  const on = (selector, event, handler) => root.querySelector(selector)?.addEventListener(event, handler);
  const renderShell = content => {
    if (!alive()) return;
    root.innerHTML = AdminLayout(section, content, { ...session, demo: service.demo });
    on('#admin-menu', 'click', event => {
      const open = root.querySelector('.admin-sidebar').classList.toggle('menu-open');
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });
    on('.admin-skip', 'click', event => { event.preventDefault(); root.querySelector('#admin-content').focus(); });
  };
  function login(error = '') {
    renderShell(`<div class="max-w-lg mx-auto py-10"><p class="eyebrow">ADMIN WORKSPACE</p><h1 class="section-title mt-4">A space to help<br>your community grow.</h1><p class="section-copy mt-4 mb-7">Sign in with an administrator account to manage HappyProgramming.</p><section class="admin-panel"><form id="admin-login" class="admin-panel-body admin-form">${error ? Notice({ message: error, type: 'error' }) : ''}<label class="admin-field" for="admin-email">Email address<input id="admin-email" name="email" type="email" autocomplete="username" required maxlength="254"></label><label class="admin-field" for="admin-password">Password<input id="admin-password" name="password" type="password" autocomplete="current-password" required></label>${Button({ label: 'Sign in to workspace', type: 'submit' })}</form></section><div class="mt-6">${Notice({ message: 'Just exploring? The demo uses sample data and does not affect real accounts.' })}<div class="mt-4">${Button({ label: 'Explore demo workspace', variant: 'outline', id: 'admin-demo' })}</div></div></div>`);
    on('#admin-demo', 'click', () => { enterDemo(); load(); });
    on('#admin-login', 'submit', async event => {
      event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
      form.querySelector('button').disabled = true;
      try { await adminService.login(values); if (!alive()) return; service = adminService; await load(); }
      catch (err) { if (alive()) login(err.message); }
    });
  }
  async function load() {
    const version = ++requestVersion;
    renderShell(`${Notice({ message: 'Loading your admin workspace…' })}<div class="mt-5">${Button({ id: 'admin-loading-login', label: 'Sign in or explore demo', variant: 'outline' })}</div>`);
    on('#admin-loading-login', 'click', () => { requestVersion++; login(); });
    try {
      const currentSession = await service.session();
      const result = await service.workspace();
      if (!alive() || version !== requestVersion) return;
      session = currentSession; data = result; render();
    } catch (err) {
      if (!alive() || version !== requestVersion) return;
      if (err.status === 401 || err.status === 403) login(err.status === 403 ? err.message : '');
      else {
        renderShell(`${Notice({ message: err.message || 'Unable to load the workspace.', type: 'error' })}<div class="admin-actions">${Button({ id: 'admin-retry', label: 'Try again' })}${Button({ id: 'admin-login-screen', label: 'Sign in or explore demo', variant: 'outline' })}</div>`);
        on('#admin-retry', 'click', load); on('#admin-login-screen', 'click', () => login());
      }
    }
  }
  function render() {
    if (!alive()) return;
    const views = { overview: () => OverviewView(data, session), users: () => UsersView(data, state), staff: () => UsersView(data, state, true), revenue: () => RevenueView(data, state), settings: () => SettingsView(data), audit: () => AuditView(data, state) };
    const content = Object.hasOwn(adminSections, section) ? views[section]() : '<h1 class="section-title">Page not found</h1><a class="btn btn-primary mt-5" href="#/admin">Back to overview</a>';
    renderShell(`<div class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="grow">${service.demo ? Notice({ message: 'Demo workspace · Sample data only. Changes are saved in this browser.' }) : '<p class="text-[11px] text-muted">Administrator workspace · Live data</p>'}</div>${Button({ label: service.demo ? 'Exit demo' : 'Sign out', variant: 'outline', size: 'sm', id: 'admin-logout' })}</div>${service.warning ? Notice({ message: service.warning }) : ''}${message ? Notice({ message }) : ''}${content}`);
    on('#admin-logout', 'click', async event => {
      event.currentTarget.disabled = true;
      try { await service.logout(); service = adminService; try { window.sessionStorage.removeItem('hpms.admin.mode'); } catch { /* optional storage */ } session = undefined; data = undefined; if (alive()) login(); }
      catch (err) { message = err.message; render(); }
    });
    on('#admin-filters', 'submit', event => { event.preventDefault(); Object.assign(state, Object.fromEntries(new FormData(event.currentTarget)), { page: 1 }); render(); root.querySelector('#admin-query')?.focus(); });
    for (const id of ['role', 'status']) on(`#${id}`, 'change', () => root.querySelector('#admin-filters').requestSubmit());
    on('#admin-clear', 'click', () => { Object.assign(state, { query: '', role: '', status: '', page: 1, from: '', to: '' }); render(); });
    on('#admin-prev', 'click', () => { state.page--; render(); root.querySelector('#admin-next')?.focus(); });
    on('#admin-next', 'click', () => { state.page++; render(); root.querySelector('#admin-prev')?.focus(); });
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
    on('#admin-settings-reset', 'click', render);
    on('#admin-settings', 'submit', event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.commissionRate = Number(values.commissionRate);
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
    const rows = [['Reference', 'Paid at (UTC)', 'Gross VND', 'Commission VND', 'Rate %'], ...revenue(data.payments, state.from, state.to).payments.map(p => [p.reference, p.paidAt, p.amount, Number(p.amount) * Number(p.commissionRate) / 100, p.commissionRate])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `happyprogramming-${service.demo ? 'demo-' : ''}revenue.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  load();
  return () => { disposed = true; requestVersion++; activeDialog?.close(); };
}
