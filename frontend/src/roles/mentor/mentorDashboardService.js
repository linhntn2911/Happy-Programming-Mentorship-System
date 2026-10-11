import { apiClient } from '../../shared/apiClient.js';

const VALID_DECISIONS = new Set(['ACCEPTED', 'REJECTED']);

async function withCsrf(headers = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf?.headerName || !csrf?.token) {
    throw new Error('Your session could not be verified. Refresh and try again.');
  }
  return { ...headers, [csrf.headerName]: csrf.token };
}

export const mentorDashboardService = {
  async getMyDashboard() {
    return apiClient('/api/mentors/me/dashboard');
  },

  async getMyRequests() {
    return apiClient('/api/mentors/me/requests', { cache: 'no-store' });
  },

  async decideOnRequest(requestId, decision) {
    const normalizedRequestId = typeof requestId === 'number'
      ? requestId
      : typeof requestId === 'string' && /^[1-9]\d*$/.test(requestId)
        ? Number(requestId)
        : Number.NaN;
    if (!Number.isSafeInteger(normalizedRequestId) || normalizedRequestId <= 0) {
      throw new TypeError('Request ID must be a positive safe integer.');
    }
    if (!VALID_DECISIONS.has(decision)) {
      throw new TypeError('Decision must be ACCEPTED or REJECTED.');
    }
    const headers = await withCsrf();
    return apiClient(`/api/mentors/me/requests/${normalizedRequestId}/decision`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ decision }),
    });
  },
};
