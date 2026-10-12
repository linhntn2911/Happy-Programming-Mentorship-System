import { mentorshipWorkspaceService } from './mentorshipWorkspaceService.js';

let activeCleanup;

export function renderWorkspaceMessageIndicator({ isMobile = false, alwaysVisible = false } = {}) {
  const visibility = alwaysVisible ? 'flex' : (isMobile ? 'flex shrink-0 lg:hidden' : 'hidden lg:flex');
  return `<a href="#/workspace" data-workspace-message-link class="relative ${visibility} h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-2xs transition hover:border-brand/40 hover:bg-lilac/30" aria-label="Mentorship messages">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>
    <span data-workspace-message-badge class="hidden absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">0</span>
  </a>`;
}

export function bindWorkspaceMessageIndicator(root = document) {
  activeCleanup?.();
  const links = [...root.querySelectorAll('[data-workspace-message-link]')];
  if (!links.length) return () => {};
  let disposed = false;
  let timer;

  async function refresh() {
    if (disposed || document.hidden) return;
    if (!links.some(link => link.isConnected)) {
      disposed = true;
      clearInterval(timer);
      return;
    }
    try {
      const workspaces = await mentorshipWorkspaceService.list();
      const seenConversations = new Set();
      const unread = (workspaces || []).reduce((sum, item) => {
        const key = item.conversationId || `subscription-${item.subscriptionId}`;
        if (seenConversations.has(key)) return sum;
        seenConversations.add(key);
        return sum + Number(item.unreadCount || 0);
      }, 0);
      links.forEach(link => {
        const badge = link.querySelector('[data-workspace-message-badge]');
        if (!badge) return;
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.classList.toggle('hidden', unread === 0);
        link.setAttribute('aria-label', unread ? `Mentorship messages, ${unread} unread` : 'Mentorship messages');
      });
    } catch {
      // Keep the last known badge while the API is temporarily unavailable.
    }
  }

  void refresh();
  timer = setInterval(refresh, 10_000);
  window.addEventListener('workspace-unread-changed', refresh);
  const cleanup = () => {
    disposed = true;
    clearInterval(timer);
    window.removeEventListener('workspace-unread-changed', refresh);
  };
  activeCleanup = cleanup;
  return cleanup;
}
