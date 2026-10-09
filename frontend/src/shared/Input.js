export function SearchForm({
  placeholder = "Try Java, React, or a mentor's name",
  buttonText = 'Find mentors',
  id = 'mentor-search',
  className = ''
} = {}) {
  return `
<form id="${id}" data-search-form class="search-form mx-auto max-w-[640px] border-brand/20 bg-white text-ink shadow-lg shadow-brand/10 ${className}" role="search" action="#/mentors">
  <span class="ml-3 text-muted">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
  </span>
  <label class="sr-only" for="${id}-input">Search by skill, name or role</label>
  <input id="${id}-input" data-search-input name="q" type="search" placeholder="${placeholder}" class="placeholder:text-muted" maxlength="100" autocomplete="off">
  <button class="btn btn-light shrink-0 !px-4 sm:!px-6" type="submit">
    ${buttonText}
    <span class="hidden sm:inline-flex"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></span>
  </button>
</form>
  `.trim();
}

export function TextInput({
  label = '',
  name = '',
  id = '',
  placeholder = '',
  type = 'text',
  value = '',
  required = false,
  error = '',
  autocomplete = '',
  maxLength = null,
  className = '',
  suffix = '',
  labelRight = ''
} = {}) {
  const inputId = id || name;
  return `
<div class="space-y-1.5 ${className}">
  ${(label || labelRight) ? `
    <div class="flex items-center justify-between gap-2">
      ${label ? `<label for="${inputId}" class="block text-xs font-semibold text-ink">${label}${required ? ' <span class="text-red-500">*</span>' : ''}</label>` : '<div></div>'}
      ${labelRight || ''}
    </div>` : ''}
  <div class="relative">
    <input type="${type}" id="${inputId}" name="${name}" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''} ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${maxLength ? `maxlength="${maxLength}"` : ''} class="w-full rounded-lg border ${error ? 'border-red-500' : 'border-line'} bg-white px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none ${suffix ? 'pr-10' : ''}">
    ${suffix ? `<div class="absolute inset-y-0 right-0 flex items-center pr-3">${suffix}</div>` : ''}
  </div>
  ${error ? `<p class="text-[11px] text-red-500">${error}</p>` : ''}
</div>
  `.trim();
}
