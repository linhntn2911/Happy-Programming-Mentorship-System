import { apiClient } from '../../shared/apiClient.js';

async function withCsrf(headers = {}) {
  try {
    const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
    if (csrf?.headerName && csrf?.token) {
      return { ...headers, [csrf.headerName]: csrf.token };
    }
  } catch (err) {
    console.warn('Could not fetch csrf token:', err);
  }
  return headers;
}

export const mentorAvailabilityService = {
  async getMyAvailability() {
    const slots = await apiClient('/api/mentors/me/availability');
    return Array.isArray(slots) ? slots : [];
  },

  async createSlot({ startAt, endAt, reason }) {
    const headers = await withCsrf();
    return apiClient('/api/mentors/me/availability', {
      method: 'POST',
      headers,
      body: JSON.stringify({ startAt, endAt, reason: reason || null }),
    });
  },

  async deleteSlot(slotId) {
    const headers = await withCsrf();
    await apiClient(`/api/mentors/me/availability/${encodeURIComponent(slotId)}`, {
      method: 'DELETE',
      headers,
    });
  },
};
