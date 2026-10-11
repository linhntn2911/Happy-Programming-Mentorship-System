import { apiClient } from '../../shared/apiClient.js';

export const mentorWalletService = {
  getWallet() {
    return apiClient('/api/mentors/me/wallet');
  },
  async requestPayout(payload) {
    const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
    return apiClient('/api/mentors/me/payout-requests', {
      method: 'POST',
      headers: { [csrf.headerName]: csrf.token },
      body: JSON.stringify(payload),
    });
  },
};
