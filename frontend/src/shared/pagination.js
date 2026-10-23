/**
 * Shared pagination component and helper utilities for HappyProgramming.
 */

/**
 * Calculates page numbers with ellipsis for pagination displays.
 *
 * @param {number} currentZero 0-indexed current page
 * @param {number} totalPages Total number of pages
 * @returns {Array<number|string>} Array of 0-indexed page numbers and 'ellipsis'
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

/**
 * Renders consistent pagination markup with Previous / Next buttons, numbered pages,
 * and a direct "Go to" dropdown.
 *
 * @param {number} currentPage Current page index (0-indexed by default, or 1-indexed if zeroIndexed = false)
 * @param {number} totalPages Total number of pages
 * @param {Object} [options] Customization options
 * @returns {string} HTML markup for the pagination controls
 */
export function renderPagination(currentPage, totalPages, options = {}) {
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

  const isFirst = currentZero === 0;
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
