import { apiClient } from './apiClient.js';
import { authService } from './authService.js';
async function mutate(path, body, method = 'POST', form = false) {
  const csrf = await apiClient('/api/auth/csrf', { credentials: 'same-origin' });
  return apiClient(`/api/admin${path}`, { method, credentials: 'same-origin', headers: { [csrf.headerName]: csrf.token, 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? new URLSearchParams(body).toString() : JSON.stringify(body) });
}
export const adminService = {
  demo: false,
  session: () => apiClient('/api/admin/session'),
  workspace: () => apiClient('/api/admin/workspace'),
  login: body => authService.login({ ...body, role: 'ADMIN' }),
  logout: () => authService.logout(),
  status: (id, change) => mutate(`/users/${id}/status`, change, 'PATCH'),
  permissions: (id, change) => mutate(`/users/${id}/permissions`, change, 'PUT'),
  settings: change => mutate('/settings', change, 'PUT'),
};
