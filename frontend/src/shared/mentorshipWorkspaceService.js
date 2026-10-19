import { apiClient } from './apiClient.js';

async function withCsrf(headers = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf?.headerName || !csrf?.token) {
    throw new Error('Your session could not be verified. Refresh and try again.');
  }
  return { ...headers, [csrf.headerName]: csrf.token };
}

export const mentorshipWorkspaceService = {
  list() {
    return apiClient('/api/mentorship-workspaces', { cache: 'no-store' });
  },
  get(conversationId) {
    return apiClient(`/api/mentorship-workspaces/${encodeURIComponent(conversationId)}`, { cache: 'no-store' });
  },
  async send(conversationId, payload) {
    const headers = await withCsrf();
    return apiClient(`/api/mentorship-workspaces/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
  async upload(conversationId, file, clientMessageKey) {
    const headers = await withCsrf();
    const form = new FormData();
    form.append('clientMessageKey', clientMessageKey);
    form.append('file', file);
    const response = await fetch(`/api/mentorship-workspaces/${encodeURIComponent(conversationId)}/files`, {
      method: 'POST', credentials: 'same-origin', headers, body: form,
    });
    let result = {};
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok) throw new Error(result.message || `Upload failed with status ${response.status}.`);
    return result.data !== undefined ? result.data : result;
  },
  downloadUrl(conversationId, messageId) {
    return `/api/mentorship-workspaces/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/file`;
  },
  async markRead(conversationId) {
    const headers = await withCsrf();
    return apiClient(`/api/mentorship-workspaces/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST', headers, body: JSON.stringify({}),
    });
  },
};
