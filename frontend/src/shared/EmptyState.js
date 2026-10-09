export function EmptyState({
  title = 'No results found',
  description = 'Try another search term or clear filters.',
  buttonText = 'Clear filters',
  id = 'empty-results',
  hidden = true
} = {}) {
  return `
<div id="${id}" class="rounded-xl border border-dashed border-line bg-white px-5 py-12 text-center" ${hidden ? 'hidden' : ''}>
  <span class="text-brand inline-block">
    <svg class="icon w-8 h-8" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
  </span>
  <h3 class="mt-3 font-semibold text-ink">${title}</h3>
  <p class="mt-2 text-sm text-muted">${description}</p>
  ${buttonText ? `<button id="reset-search" class="btn btn-outline mt-5">${buttonText}</button>` : ''}
</div>
  `.trim();
}
