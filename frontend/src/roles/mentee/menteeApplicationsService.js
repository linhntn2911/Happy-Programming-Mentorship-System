import { apiClient } from '../../shared/apiClient.js';

async function withCsrf(headers = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf?.headerName || !csrf?.token) {
    throw new Error('Your session could not be verified. Refresh and try again.');
  }
  return { ...headers, [csrf.headerName]: csrf.token };
}

export const menteeApplicationsService = {
  list({ page = 0, size = 10, status = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    return apiClient(`/api/mentorship-requests/mine?${params}`, { cache: 'no-store' });
  },
  async cancel(requestId) {
    const headers = await withCsrf();
    return apiClient(`/api/mentorship-requests/${encodeURIComponent(requestId)}/cancel`, { method: 'POST', headers });
  },
};
