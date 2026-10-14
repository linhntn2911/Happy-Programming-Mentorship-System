import { apiClient } from './apiClient.js';

export const contactService = {
  read: () => apiClient('/api/public/contact', { cache: 'no-store' }),
};
