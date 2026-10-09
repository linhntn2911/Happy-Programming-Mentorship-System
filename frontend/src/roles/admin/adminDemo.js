import { PERMISSIONS } from './admin.js';
const KEY = 'hpms.admin.demo.v1';
const clone = value => structuredClone(value);
export function createDemoData() {
  const names = ['Alex Nguyen', 'Minh An Nguyen', 'Thao Linh Tran', 'Hoang Nam Le', 'Mai Anh Pham', 'Linh Tran', 'Duc Hoang', 'Sofia Tran', 'David Pham', 'Bao Nguyen', 'Kim Le', 'Anh Vu'];
  const roles = ['ADMIN', 'MENTOR', 'MENTOR', 'MENTOR', 'MENTEE', 'STAFF', 'MENTEE', 'STAFF', 'MENTOR', 'MENTEE', 'MENTEE', 'MENTEE'];
  const now = new Date();
  return {
    users: names.map((name, index) => ({ id: index + 1, name, email: name.toLowerCase().replaceAll(' ', '.') + '@example.com', role: roles[index], status: index === 6 ? 'LOCKED' : index === 10 ? 'INACTIVE' : 'ACTIVE', createdAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.max(1, now.getUTCDate() - index))).toISOString(), permissions: roles[index] === 'STAFF' ? Object.keys(PERMISSIONS).slice(0, index === 5 ? 3 : 1) : [] })),
    settings: { commissionRate: 15, supportEmail: 'support@example.com' },
    payments: Array.from({ length: 18 }, (_, i) => ({ id: i + 1, reference: `DEMO-${String(i + 1).padStart(5, '0')}`, amount: [2500000, 1800000, 500000, 2800000, 400000, 2200000][i % 6], commissionRate: i < 8 ? 15 : 12, status: i === 4 ? 'FAILED' : i === 7 ? 'PENDING' : 'SUCCEEDED', gateway: 'VNPAY', gatewayTransactionId: `demo-vnpay-${i + 1}`, paidAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - Math.floor(i / 3), Math.min(now.getUTCDate(), 20), 9)).toISOString() })),
    audit: [{ id: 1, actor: 'Alex Nguyen', actorId: 1, action: 'STAFF_PERMISSIONS_CHANGED', target: 'USER:6', reason: 'Assigned the community operations team.', ipAddress: '127.0.0.1', createdAt: new Date().toISOString() }],
  };
}
export function createDemoService(storage) {
  let state;
  let persistenceWarning = '';
  try { const saved = JSON.parse(storage?.getItem(KEY) || 'null'); state = saved?.users?.length && Array.isArray(saved.payments) && Array.isArray(saved.audit) && saved.settings ? saved : createDemoData(); }
  catch { state = createDemoData(); persistenceWarning = 'Browser storage is unavailable. Demo changes last for this visit only.'; }
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(state)); } catch { persistenceWarning = 'Browser storage is unavailable. Demo changes last for this visit only.'; } };
  const audit = (action, target, reason) => state.audit.unshift({ id: Math.max(0, ...state.audit.map(a => a.id)) + 1, actor: state.users[0].name, actorId: 1, action, target, reason, ipAddress: '127.0.0.1', createdAt: new Date().toISOString() });
  const reasonCheck = reason => { if (!reason?.trim() || reason.length > 1000) throw new Error('Provide a reason of 1–1,000 characters.'); };
  return {
    demo: true,
    get warning() { return persistenceWarning; },
    async session() { return { id: 1, name: state.users[0].name, email: state.users[0].email }; },
    async workspace() { return clone(state); },
    async status(id, change) {
      reasonCheck(change.reason);
      const user = state.users.find(u => u.id === Number(id));
      if (!user || user.role === 'ADMIN') throw new Error('Administrator accounts cannot be changed here.');
      if (!['ACTIVE', 'INACTIVE', 'LOCKED'].includes(change.status)) throw new Error('Invalid account status.');
      if (user.status === change.status) return;
      user.status = change.status; audit('ACCOUNT_STATUS_CHANGED', `USER:${id}`, change.reason); save();
    },
    async permissions(id, change) {
      reasonCheck(change.reason);
      const user = state.users.find(u => u.id === Number(id));
      if (!user || user.role !== 'STAFF') throw new Error('Permissions can only be assigned to staff.');
      if (!Array.isArray(change.permissions) || change.permissions.some(p => !Object.hasOwn(PERMISSIONS, p))) throw new Error('Unknown staff permission.');
      user.permissions = [...new Set(change.permissions)]; audit('STAFF_PERMISSIONS_CHANGED', `USER:${id}`, change.reason); save();
    },
    async settings(change) {
      reasonCheck(change.reason);
      if (!Number.isFinite(Number(change.commissionRate)) || Number(change.commissionRate) < 0 || Number(change.commissionRate) > 100 || !/^\d+(\.\d{1,2})?$/.test(String(change.commissionRate))) throw new Error('Commission must be between 0 and 100, with at most two decimal places.');
      if (change.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(change.supportEmail)) throw new Error('Enter a valid support email.');
      state.settings = { commissionRate: Number(change.commissionRate), supportEmail: change.supportEmail }; audit('SETTINGS_CHANGED', 'SYSTEM_CONFIG:platform', change.reason); save();
    },
    async logout() {},
  };
}
