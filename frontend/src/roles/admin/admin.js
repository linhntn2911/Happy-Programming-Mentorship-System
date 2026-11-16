export const PERMISSIONS = {
  MENTOR_APPLICATION_MANAGE: 'Review mentor applications',
  MENTEE_MANAGE: 'Manage mentee accounts',
  MENTORSHIP_REQUEST_MANAGE: 'Manage mentorship requests',
  SKILL_MANAGE: 'Manage technical skills',
};
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const dateTime = value => {
  if (!value) return 'Not available';
  const str = String(value).trim();
  const utcStr = (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str))
    ? str + 'Z'
    : (str.includes(' ') && !str.includes('T') && !str.endsWith('Z'))
      ? str.replace(' ', 'T') + 'Z'
      : str;
  const date = new Date(utcStr);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
export function filterUsers(users, { query = '', role = '', status = '' } = {}) {
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return users.filter(user => (!role || user.role === role) && (!status || user.status === status) && words.every(word => normalize(`${user.name} ${user.email}`).includes(word)));
}
export const paymentCommission = p => Math.round(Number(p.amount) * Number(p.commissionRate) / 100);
export function revenue(payments, from = '', to = '') {
  const verified = payments.filter(p => p.status === 'SUCCEEDED' && ['SEPAY', 'VNPAY'].includes(p.gateway) && p.gatewayTransactionId?.trim() && p.paidAt && (!from || p.paidAt.slice(0, 10) >= from) && (!to || p.paidAt.slice(0, 10) <= to));
  return { payments: verified, gross: verified.reduce((sum, p) => sum + Number(p.amount), 0), commission: verified.reduce((sum, p) => sum + paymentCommission(p), 0) };
}
export function pageItems(items, page, size = 8) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.max(1, Math.min(page, pages));
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length };
}
