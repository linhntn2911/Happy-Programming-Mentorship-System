import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoService, createDemoData } from '../src/roles/admin/adminDemo.js';
import { filterUsers, revenue, pageItems, PERMISSIONS } from '../src/roles/admin/admin.js';
import { escapeHtml } from '../src/shared/html.js';
import { UsersView, OverviewView, AuditView } from '../src/roles/admin/AdminViews.js';

const memory = () => { const store = new Map(); return { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) }; };
test('search matches accented names and combines role and status filters', () => {
  const users = [{ name: 'Đặng Linh', email: 'linh@example.com', role: 'STAFF', status: 'ACTIVE' }, { name: 'Linh Tran', email: 'tran@example.com', role: 'MENTEE', status: 'LOCKED' }];
  assert.equal(filterUsers(users, { query: 'dang LINH', role: 'STAFF', status: 'ACTIVE' }).length, 1);
  assert.equal(filterUsers(users, { query: 'linh', role: 'STAFF', status: 'LOCKED' }).length, 0);
});
test('pagination clamps to available pages including empty results', () => {
  assert.deepEqual(pageItems([], 8), { items: [], page: 1, pages: 1, total: 0 });
  assert.deepEqual(pageItems(Array.from({ length: 12 }, (_, i) => i), 3).items, [8, 9, 10, 11]);
});
test('revenue excludes failed, unverified and non-VNPay payments and uses snapshots', () => {
  const payment = { amount: 100000, commissionRate: 12, status: 'SUCCEEDED', gateway: 'VNPAY', gatewayTransactionId: 'verified', paidAt: '2026-09-30T12:00:00Z' };
  const report = revenue([payment, { ...payment, commissionRate: 15 }, { ...payment, status: 'FAILED' }, { ...payment, gatewayTransactionId: null }, { ...payment, gateway: 'OTHER' }], '2026-09-30', '2026-09-30');
  assert.equal(report.gross, 200000); assert.equal(report.commission, 27000); assert.equal(report.payments.length, 2);
  assert.equal(revenue([payment], '2026-10-01').gross, 0);
});
test('status changes persist and append audit entries without changing other users', async () => {
  const storage = memory(); const service = createDemoService(storage); const before = await service.workspace();
  await service.status(2, { status: 'LOCKED', reason: 'Account review' });
  const after = await createDemoService(storage).workspace();
  assert.equal(after.users[1].status, 'LOCKED'); assert.deepEqual(after.users[0], before.users[0]);
  assert.equal(after.audit.length, before.audit.length + 1); assert.equal(after.audit[0].reason, 'Account review');
  await assert.rejects(service.status(1, { status: 'LOCKED', reason: 'Review' }));
  await assert.rejects(service.status(2, { status: 'ACTIVE', reason: ' ' }));
});
test('permissions only accept the canonical allowlist on staff', async () => {
  const service = createDemoService(memory());
  await service.permissions(6, { permissions: Object.keys(PERMISSIONS), reason: 'Team assignment' });
  assert.equal((await service.workspace()).users[5].permissions.length, 4);
  await assert.rejects(service.permissions(2, { permissions: [], reason: 'Review' }));
  await assert.rejects(service.permissions(6, { permissions: ['ADMIN'], reason: 'Review' }));
});
test('configuration rejects invalid input and preserves historical commission', async () => {
  const service = createDemoService(memory()); const before = revenue((await service.workspace()).payments).commission;
  await service.settings({ commissionRate: 20, supportEmail: 'support@example.com', reason: 'New rate' });
  assert.equal((await service.workspace()).settings.commissionRate, 20);
  assert.equal(revenue((await service.workspace()).payments).commission, before);
  for (const rate of [-1, 101, NaN, 2.345]) await assert.rejects(service.settings({ commissionRate: rate, supportEmail: '', reason: 'Invalid' }));
});
test('blocked browser storage retains changes in memory and explains persistence', async () => {
  const service = createDemoService({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  await service.status(2, { status: 'INACTIVE', reason: 'Demo test' });
  assert.equal((await service.workspace()).users[1].status, 'INACTIVE'); assert.match(service.warning, /visit only/);
});
test('account and audit markup escapes untrusted HTML in text and attributes', () => {
  const data = createDemoData(); const malicious = '<img src=x onerror="alert(1)">';
  data.users[1].name = malicious; data.audit[0].reason = malicious;
  const state = { query: '', role: '', status: '', page: 1 };
  const markup = UsersView(data, state) + OverviewView(data, { name: malicious }) + AuditView(data, state);
  assert.ok(!markup.includes(malicious)); assert.ok(markup.includes(escapeHtml(malicious)));
});
