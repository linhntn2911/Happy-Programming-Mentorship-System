import { apiClient } from '../../shared/apiClient.js';

async function withCsrf() {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf?.headerName || !csrf?.token) {
    throw new Error('Your session could not be verified. Refresh and try again.');
  }
  return { [csrf.headerName]: csrf.token };
}

export const mentorDisputeService = {
  list(status) {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient(`/api/mentors/me/disputes${query}`, { cache: 'no-store' });
  },
  get(disputeId) {
    return apiClient(`/api/mentors/me/disputes/${encodeURIComponent(disputeId)}`, { cache: 'no-store' });
  },
  async respond(disputeId, message, files = []) {
    const headers = await withCsrf();
    const form = new FormData();
    form.append('message', message);
    files.filter(Boolean).forEach(file => form.append('files', file));
    const response = await fetch(`/api/mentors/me/disputes/${encodeURIComponent(disputeId)}/responses`, {
      method: 'POST', credentials: 'same-origin', headers, body: form,
    });
    let result = {};
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok) throw new Error(result.message || `Response failed with status ${response.status}.`);
    return result.data !== undefined ? result.data : result;
  },
  evidenceUrl(disputeId, evidenceId) {
    return `/api/mentors/me/disputes/${encodeURIComponent(disputeId)}/evidence/${encodeURIComponent(evidenceId)}/file`;
  },
};
