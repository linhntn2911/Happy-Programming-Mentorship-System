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
  return `
<article class="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
  <div class="flex items-start justify-between gap-3">
    <p class="text-sm font-medium text-muted">${escapeHtml(label)}</p>
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lilac text-brand" aria-hidden="true">${escapeHtml(icon)}</span>
  </div>
  <p class="mt-4 break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">${escapeHtml(value)}</p>
  <p class="mt-2 text-xs leading-5 text-muted">${escapeHtml(description)}</p>
</article>`;
}
