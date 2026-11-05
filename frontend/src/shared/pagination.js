// Reusable client-side pagination control shared by mentor workspace lists.
// Renders Previous / numbered pages / Next plus a "Go to: Page X of Y" select.
// Pages are 1-based. All navigation is emitted through onChange; the component
// never fetches, so callers keep search/filter/paging entirely in frontend state.

function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page]);
  for (let offset = 1; offset <= 1; offset += 1) {
    pages.add(page - offset);
    pages.add(page + offset);
  }
  if (page <= 3) [2, 3, 4].forEach(n => pages.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach(n => pages.add(n));
  return [...pages].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
}

function numberButtons(page, totalPages) {
  const pages = pageWindow(page, totalPages);
  let previous = 0;
  return pages.map(n => {
    const gap = previous && n - previous > 1 ? '<span class="px-1 text-xs text-muted" aria-hidden="true">…</span>' : '';
    previous = n;
    const active = n === page;
    return `${gap}<button type="button" class="btn btn-sm ${active ? 'btn-primary' : 'btn-outline'} min-w-9" data-goto="${n}"${active ? ' aria-current="page"' : ''}>${n}</button>`;
  }).join('');
}

export function renderPagination({ page, totalPages, label = 'Pagination' } = {}) {
  const total = Math.max(1, Number(totalPages) || 1);
  if (total <= 1) return '';
  const current = Math.min(Math.max(1, Number(page) || 1), total);
  const options = Array.from({ length: total }, (_, i) => `<option value="${i + 1}"${i + 1 === current ? ' selected' : ''}>Page ${i + 1} of ${total}</option>`).join('');
  return `<nav class="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="${label}" data-pagination>
    <div class="flex flex-wrap items-center gap-1.5">
      <button type="button" class="btn btn-outline btn-sm" data-page="prev"${current <= 1 ? ' disabled' : ''}>← Previous</button>
      ${numberButtons(current, total)}
      <button type="button" class="btn btn-outline btn-sm" data-page="next"${current >= total ? ' disabled' : ''}>Next →</button>
    </div>
    <label class="flex items-center gap-2 text-xs text-muted">Go to:
      <select class="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none" data-page-select>${options}</select>
    </label>
  </nav>`;
}

export function bindPagination(container, { onChange } = {}) {
  if (!container || typeof onChange !== 'function') return () => {};
  const handleClick = event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const step = target.closest('[data-page]');
    if (step && !step.disabled) {
      const select = container.querySelector('[data-page-select]');
      const current = Number(select?.value) || 1;
      onChange(step.dataset.page === 'next' ? current + 1 : current - 1);
      return;
    }
    const jump = target.closest('[data-goto]');
    if (jump) onChange(Number(jump.dataset.goto));
  };
  const handleChange = event => {
    if (event.target.closest('[data-page-select]')) onChange(Number(event.target.value));
  };
  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);
  return () => {
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
  };
}
