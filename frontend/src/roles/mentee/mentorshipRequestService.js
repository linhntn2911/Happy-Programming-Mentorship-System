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

  async createOneOff(payload) {
    const headers = await withCsrf();
    return apiClient('/api/one-off-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async getCheckoutInfo(requestId) {
    // This endpoint is polled after a bank transfer. Never reuse a cached pending
    // response, otherwise a verified SePay payment could leave the checkout on its QR.
    return apiClient(`/api/mentorship-requests/${requestId}/checkout-info`, { cache: 'no-store' });
  },

  async processCheckout(requestId) {
    const headers = await withCsrf();
    return apiClient(`/api/mentorship-requests/${requestId}/checkout`, {
      method: 'POST',
      headers,
    });
  },
};
