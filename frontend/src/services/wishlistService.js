import { apiClient } from './apiClient.js';

async function mutate(method, slug) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return apiClient(`/api/wishlists/${encodeURIComponent(slug)}`, {
    method,
    headers: { [csrf.headerName]: csrf.token }
  });
}

export const wishlistService = {
  list: async () => {
    const result = await apiClient('/api/wishlists', { cache: 'no-store' });
    return Array.isArray(result?.mentorSlugs) ? result.mentorSlugs : [];
  },
  save: slug => mutate('PUT', slug),
  remove: slug => mutate('DELETE', slug)
};
