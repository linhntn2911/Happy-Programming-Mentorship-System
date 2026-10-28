import { apiClient } from './apiClient.js';
export function announcementText(settings) {
  return [settings.maintenance ? 'The system is under maintenance. Some functions are temporarily unavailable.' : '', settings.announcement || ''].filter(Boolean).join(' ');
}
export function registerSystemOperations() {
  const banner = document.createElement('aside');
  banner.className = 'bg-lilac text-ink border-b border-line px-6 py-3 text-sm';
  banner.setAttribute('role', 'status'); banner.setAttribute('aria-live', 'polite'); banner.hidden = true;
  document.body.prepend(banner);
  let pending = false;
  const refresh = async () => {
    if (pending || document.hidden) return;
    pending = true;
    try { const data = await apiClient('/api/public/operations'); banner.textContent = announcementText(data); banner.hidden = !banner.textContent; }
    catch { /* Retain the last observed status during temporary network failures. */ }
    finally { pending = false; }
  };
  refresh(); const timer = setInterval(refresh, 30000);
  window.addEventListener('hashchange', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => { clearInterval(timer); window.removeEventListener('hashchange', refresh); document.removeEventListener('visibilitychange', refresh); banner.remove(); };
}
