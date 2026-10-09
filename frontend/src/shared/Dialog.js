export function Dialog({
  id = '',
  title = '',
  eyebrow = '',
  content = '',
  footer = ''
} = {}) {
  return `
<dialog id="${id}" class="modal" aria-labelledby="${id}-title">
  <button class="modal-close" data-close aria-label="Close">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>
  </button>
  ${eyebrow ? `<p class="eyebrow !pr-8">${eyebrow}</p>` : ''}
  ${title ? `<h2 id="${id}-title" class="mt-4 font-display text-3xl text-ink">${title}</h2>` : ''}
  <div class="mt-4 text-sm leading-7 text-muted">
    ${content}
  </div>
  ${footer ? `<div class="mt-6">${footer}</div>` : ''}
</dialog>
  `.trim();
}
