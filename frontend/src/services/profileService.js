import { apiClient } from './apiClient.js';
async function write(path, method, body) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return apiClient(`/api/profile/me${path}`, {
    method, headers: { [csrf.headerName]: csrf.token },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
export const profileService = {
  get: () => apiClient('/api/profile/me', { cache: 'no-store' }),
  save: body => write('', 'PUT', body),
  upload: base64 => write('/avatar', 'PUT', { base64 }),
  removeAvatar: () => write('/avatar', 'DELETE')
};
