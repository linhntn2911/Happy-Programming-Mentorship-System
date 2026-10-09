import { escapeHtml as e } from '../../utils/html.js';

export function StatCard({ label, value, note = '', icon = '' }) {
  return `<article class="stat-card"><div class="stat-label">${e(label)}${icon}</div><p class="stat-value">${e(value)}</p><p class="stat-note">${e(note)}</p></article>`;
}

export function StatusBadge(status) {
  const tone = {
    ACTIVE: 'success',
    APPROVED: 'success',
    ACCEPTED: 'success',
    RESOLVED: 'success',
    SUCCEEDED: 'success',
    INACTIVE: 'neutral',
    LOCKED: 'danger',
    REJECTED: 'danger',
    CANCELLED: 'danger',
    PENDING: 'warning',
    FAILED: 'danger',
    EXPIRED: 'neutral'
  }[status] || 'neutral';
  return `<span class="status-badge status-${tone}"><span aria-hidden="true">●</span> ${e(String(status).toLowerCase().replaceAll('_', ' '))}</span>`;
}

export function DataTable({ caption, headings, rows, empty = '' }) {
  if (!rows.length) return empty;
  return `<div class="data-table-scroll" role="region" aria-label="${e(caption)}" tabindex="0"><table class="data-table"><caption class="sr-only">${e(caption)}</caption><thead><tr>${headings.map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function Notice({ message, type = 'info' }) {
  return `<div class="admin-notice ${type === 'error' ? 'notice-error' : ''}" role="${type === 'error' ? 'alert' : 'status'}">${e(message)}</div>`;
}
