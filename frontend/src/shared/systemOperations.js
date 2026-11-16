import { apiClient } from './apiClient.js';
export function announcementText(settings) {
  return [settings.maintenance ? 'The system is under maintenance. Some functions are temporarily unavailable.' : '', settings.announcement || ''].filter(Boolean).join(' ');
}
export function registerSystemOperations() {
  const banner = document.createElement('aside');
  banner.className = 'bg-lilac text-ink border-b border-line px-6 py-2.5 text-sm flex items-center justify-between gap-4 z-50';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;

  const content = document.createElement('div');
  content.className = 'grow';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'text-muted hover:text-ink font-semibold px-2 py-0.5 rounded text-lg leading-none shrink-0';
  closeBtn.setAttribute('aria-label', 'Dismiss banner');
  closeBtn.innerHTML = '&times;';

  banner.append(content, closeBtn);
  document.body.prepend(banner);

  let dismissedText = null;
  closeBtn.addEventListener('click', () => {
    dismissedText = content.textContent;
    banner.hidden = true;
  });

  let pending = false;
  const refresh = async () => {
    if (pending || document.hidden) return;
    pending = true;
    try {
      const data = await apiClient('/api/public/operations');
      const text = announcementText(data);
      if (!text || text === dismissedText) {
        banner.hidden = true;
      } else {
        content.textContent = text;
        banner.hidden = false;
      }
    }
    catch { /* Retain the last observed status during temporary network failures. */ }
    finally { pending = false; }
  };
  refresh();
  const timer = setInterval(refresh, 30000);
  window.addEventListener('hashchange', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    clearInterval(timer);
    window.removeEventListener('hashchange', refresh);
    document.removeEventListener('visibilitychange', refresh);
    banner.remove();
  };
}
