import { apiClient } from './apiClient.js';

let supportPromise;

export function SupportEmailLink({ label = 'Contact support', className = '' } = {}) {
  return `<a data-support-email hidden class="${className}" href="#">${label}</a>`;
}

export async function loadSupportEmail() {
  if (!supportPromise) {
    supportPromise = apiClient('/api/public/support', { cache: 'no-store' })
      .then(config => String(config?.supportEmail || '').trim())
      .catch(() => '');
  }
  return supportPromise;
}

export async function hydrateSupportEmail(container = document) {
  const links = [...container.querySelectorAll('[data-support-email]')];
  if (!links.length) return;
  const email = await loadSupportEmail();
  for (const link of links) {
    if (!email) {
      link.hidden = true;
      link.removeAttribute('href');
      continue;
    }
    link.href = `mailto:${email}`;
    link.hidden = false;
    link.setAttribute('aria-label', `Contact support at ${email}`);
  }
}
