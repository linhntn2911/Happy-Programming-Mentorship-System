/**
 * Shared pagination component and helper utilities for HappyProgramming.
 */

export function getPageNumbers(currentZero, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set([0, totalPages - 1]);
  for (let i = Math.max(0, currentZero - 1); i <= Math.min(totalPages - 1, currentZero + 1); i++) {
    pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p - prev > 1) {
      result.push('ellipsis');
    }
    result.push(p);
    prev = p;
  }
  return result;
}

export function paginateItems(items = [], page = 1, pageSize = 10) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / safePageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (currentPage - 1) * safePageSize;
  return {
    items: safeItems.slice(start, start + safePageSize),
    page: currentPage,
    pageSize: safePageSize,
    totalItems: safeItems.length,
    totalPages
  };
}

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

export function renderPagination(arg1, arg2, options = {}) {
  // If called with an options object: renderPagination({ page, totalPages, label })
  if (typeof arg1 === 'object' && arg1 !== null) {
    const { page = 1, totalPages = 1, label = 'Pagination' } = arg1;
    const total = Math.max(1, Number(totalPages) || 1);
    if (total <= 1) return '';
    const current = Math.min(Math.max(1, Number(page) || 1), total);
    const opts = Array.from({ length: total }, (_, i) => `<option value="${i + 1}"${i + 1 === current ? ' selected' : ''}>Page ${i + 1} of ${total}</option>`).join('');
    return `<nav class="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="${label}" data-pagination>
    <div class="flex flex-wrap items-center gap-1.5">
      <button type="button" class="btn btn-outline btn-sm" data-page="prev"${current <= 1 ? ' disabled' : ''}>← Previous</button>
      ${numberButtons(current, total)}
      <button type="button" class="btn btn-outline btn-sm" data-page="next"${current >= total ? ' disabled' : ''}>Next →</button>
    </div>
    <label class="flex items-center gap-2 text-xs text-muted">Go to:
      <select class="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none" data-page-select>${opts}</select>
    </label>
  </nav>`;
  }

  // Positional call: renderPagination(currentPage, totalPages, options)
  const currentPage = arg1;
  const totalPages = Number(arg2) || 0;
  if (totalPages <= 1) return '';

  const {
    idPrefix = 'jump-page',
    selectLabel = 'Go to:',
    prevLabel = '← Previous',
    nextLabel = 'Next →',
    ariaLabel = 'Pagination',
    containerClass = 'mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-5',
    zeroIndexed = true,
  } = options;

  const currentZero = zeroIndexed ? currentPage : currentPage - 1;
  const pageNumbers = getPageNumbers(currentZero, totalPages);

  const pageItems = pageNumbers.map(item => {
    if (item === 'ellipsis') {
      return '<span class="grid h-8 w-8 place-items-center text-xs text-muted" aria-hidden="true">…</span>';
    }
    const isActive = item === currentZero;
    const value = zeroIndexed ? item : item + 1;
    return `<button type="button" data-page-jump="${value}" aria-current="${isActive ? 'page' : 'false'}" class="btn btn-sm min-w-8 h-8 px-2.5 text-xs font-semibold ${isActive ? 'btn-primary' : 'btn-outline'}">${item + 1}</button>`;
  }).join('');

  const selectOptions = Array.from({ length: totalPages }, (_, i) => {
    const value = zeroIndexed ? i : i + 1;
    return `<option value="${value}" ${i === currentZero ? 'selected' : ''}>Page ${i + 1}</option>`;
  }).join('');

  const isFirst = currentZero <= 0;
  const isLast = currentZero + 1 >= totalPages;

  return `<nav class="${containerClass}" aria-label="${ariaLabel}">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" data-page="previous" class="btn btn-outline btn-sm" ${isFirst ? 'disabled' : ''}>${prevLabel}</button>
      <div class="flex items-center gap-1.5" role="group" aria-label="Page numbers">${pageItems}</div>
      <button type="button" data-page="next" class="btn btn-outline btn-sm" ${isLast ? 'disabled' : ''}>${nextLabel}</button>
    </div>
    <div class="flex items-center gap-2 text-xs text-muted">
      <label for="${idPrefix}-select" class="font-medium text-ink">${selectLabel}</label>
      <select id="${idPrefix}-select" data-page-select class="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:border-brand focus:outline-none">
        ${selectOptions}
      </select>
      <span>of ${totalPages} pages</span>
    </div>
  </nav>`;
}

export function bindPagination(container, { onChange } = {}) {
  if (!container || typeof onChange !== 'function') return () => { };
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
