import { contactService } from './contactService.js';
import { escapeHtml } from './html.js';

export function supportContactMarkup(email) {
  if (!email) return '';
  return `<a class="hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" href="mailto:${encodeURIComponent(email)}">Contact support: ${escapeHtml(email)}</a>`;
}

export function mountSupportContact(host, load = contactService.read) {
  let disposed = false;
  let busy = false;
  async function refresh() {
    if (disposed || busy) return;
    busy = true;
    host.hidden = false;
    host.innerHTML = '<span role="status">Loading support contact…</span>';
    try {
      const contact = await load();
      if (disposed) return;
      if (typeof contact?.supportEmail !== 'string') throw new Error('Invalid contact response');
      const email = contact.supportEmail.trim();
      host.innerHTML = supportContactMarkup(email);
      host.hidden = !email;
    } catch {
      if (!disposed) host.innerHTML = '<span role="status">Support contact unavailable.</span> <button type="button" data-retry-contact class="text-brand underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Try again</button>';
    } finally {
      busy = false;
    }
  }
  const retry = event => { if (event.target.closest?.('[data-retry-contact]')) void refresh(); };
  host.addEventListener('click', retry);
  void refresh();
  return () => { disposed = true; host.removeEventListener('click', retry); };
}

export function registerSupportContact() {
  if (customElements.get('hp-support-contact')) return;
  customElements.define('hp-support-contact', class extends HTMLElement {
    connectedCallback() {
      this.disposeContact?.();
      this.disposeContact = mountSupportContact(this);
    }
    disconnectedCallback() { this.disposeContact?.(); }
  });
}
