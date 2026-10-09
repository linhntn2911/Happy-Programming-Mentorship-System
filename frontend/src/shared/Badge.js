export function Badge({
  text = '',
  variant = 'lilac', // 'lilac' | 'brand' | 'gray'
  className = ''
} = {}) {
  const variantClass = variant === 'brand' 
    ? 'bg-brand text-white' 
    : variant === 'gray' 
      ? 'bg-line text-muted' 
      : 'bg-lilac text-brand';

  return `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${variantClass} ${className}">${text}</span>`;
}

export function TopicPill({
  text = '',
  quickSearch = '',
  className = ''
} = {}) {
  return `<button class="topic-pill ${className}" data-quick-search="${quickSearch || text}">${text}</button>`;
}
