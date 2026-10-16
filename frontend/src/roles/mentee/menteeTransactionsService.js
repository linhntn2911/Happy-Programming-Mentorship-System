import { apiClient } from '../../shared/apiClient.js';

export const menteeTransactionsService = {
  list() { return apiClient('/api/payments/mine', { cache: 'no-store' }); },
};
