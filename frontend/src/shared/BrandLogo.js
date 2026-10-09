import { escapeHtml } from './html.js';

/**
 * Canonical HappyProgramming Brand Logo Component
 * Enforces unified visual presentation across all public, auth, and workspace pages.
 *
 * Visual structure:
 * - Badge mark: Rounded square in brand purple (#8b46e8) with white bold monospace '{h}'
 * - Brand wordmark: 'Happy' in primary ink (#25143f) followed by 'Programming' in brand purple (#8b46e8)
 */
export function BrandLogo({
  href = '#/',
  markClass = 'h-9 w-9 text-xl',
  textClass = 'text-[16px]',
  className = '',
  hideTextOnMobile = false,
  ariaLabel = 'HappyProgramming home'
} = {}) {
  const textVisibility = hideTextOnMobile ? 'hidden sm:inline' : 'inline';
  return `
    <a href="${escapeHtml(href)}" class="flex shrink-0 items-center gap-2.5 ${className}" aria-label="${escapeHtml(ariaLabel)}">
      <span class="grid ${markClass} place-items-center rounded-[10px] bg-brand font-mono font-bold text-white shrink-0" aria-hidden="true">{h}</span>
      <span class="${textClass} font-semibold tracking-tight text-ink ${textVisibility}">Happy<span class="text-brand">Programming</span></span>
    </a>
  `.trim();
}
