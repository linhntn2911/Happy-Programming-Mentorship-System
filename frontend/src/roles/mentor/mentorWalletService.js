import { apiClient } from '../../shared/apiClient.js';

async function withCsrf() {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return { [csrf.headerName]: csrf.token };
}

export const mentorWalletService = {
  getWallet() {
    return apiClient('/api/mentors/me/wallet');
  },
  getBankAccount() {
    return apiClient('/api/mentors/me/bank-account');
  },
  async saveBankAccount(payload) {
    const headers = await withCsrf();
    return apiClient('/api/mentors/me/bank-account', {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
  },
  async requestPayoutOtp(amount) {
    const headers = await withCsrf();
    return apiClient('/api/mentors/me/payout-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount }),
    });
  },
  async requestPayout(payload) {
    const headers = await withCsrf();
    return apiClient('/api/mentors/me/payout-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
};
