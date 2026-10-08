import { adminIcon } from '../layout/AdminLayout.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function DashboardMetricCard({ label, value, description, icon }) {
  const iconMarkup = ['overview', 'users', 'staff', 'revenue', 'settings', 'audit'].includes(icon)
    ? adminIcon(icon)
    : escapeHtml(icon);
  return `
<article class="stat-card">
  <div class="stat-label">
    <p>${escapeHtml(label)}</p>
    <span aria-hidden="true">${iconMarkup}</span>
  </div>
  <p class="stat-value">${escapeHtml(value)}</p>
  <p class="stat-note">${escapeHtml(description)}</p>
</article>`;
}
