import { apiClient } from './apiClient.js';

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

export const notificationService = {
  async getNotifications() {
    try {
      const res = await apiClient('/api/notifications');
      return res || { unreadCount: 0, notifications: [] };
    } catch {
      return { unreadCount: 0, notifications: [] };
    }
  },

  async markAsRead(id) {
    try {
      const headers = await withCsrf();
      return await apiClient(`/api/notifications/${id}/read`, { method: 'POST', headers });
    } catch {
      return false;
    }
  },

  async markAllAsRead() {
    try {
      const headers = await withCsrf();
      return await apiClient('/api/notifications/read-all', { method: 'POST', headers });
    } catch {
      return 0;
    }
  }
};
