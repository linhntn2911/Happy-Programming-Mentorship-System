import { apiClient } from '../../shared/apiClient.js';

export const menteeTransactionsService = {
  list({ page = 0, size = 10, status = '', serviceType = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set('status', status);
    if (serviceType) params.set('serviceType', serviceType);
    return apiClient(`/api/payments/mine?${params}`, { cache: 'no-store' });
  },
};
