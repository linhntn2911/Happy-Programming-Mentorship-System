export function Button({
  label = 'Button',
  variant = 'primary', // 'primary' | 'secondary' | 'light' | 'outline' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  type = 'button',
  disabled = false,
  className = '',
  icon = '',
  id = ''
} = {}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;
  const idAttr = id ? `id="${id}"` : '';
  const disabledAttr = disabled ? 'disabled aria-disabled="true"' : '';

  return `
    <button type="${type}" ${idAttr} class="btn ${variantClass} ${sizeClass} ${className}" ${disabledAttr}>
      ${label}
      ${icon ? `<span class="inline-flex">${icon}</span>` : ''}
    </button>
  `.trim();
}
