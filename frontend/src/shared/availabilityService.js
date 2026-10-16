import { apiClient } from './apiClient.js';

async function withCsrf(headers = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return csrf?.headerName && csrf?.token ? { ...headers, [csrf.headerName]: csrf.token } : headers;
}

export const availabilityService = {
  async getPublicSlots(identifier, serviceOfferingId, { from, to } = {}) {
    const params = new URLSearchParams({ serviceOfferingId: String(serviceOfferingId) });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const slots = await apiClient(`/api/mentors/${encodeURIComponent(identifier)}/availability?${params.toString()}`);
    return Array.isArray(slots) ? slots : [];
  },
  async holdSlot(payload) {
    const headers = await withCsrf();
    return apiClient('/api/slot-holds', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
  async releaseHold(holdId) {
    const headers = await withCsrf();
    return apiClient(`/api/slot-holds/${encodeURIComponent(holdId)}`, { method: 'DELETE', headers });
  },
};
