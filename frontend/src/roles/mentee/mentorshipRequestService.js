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

export const mentorshipRequestService = {
  async createRequest(payload) {
    const headers = await withCsrf();
    return apiClient('/api/mentorship-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
};
