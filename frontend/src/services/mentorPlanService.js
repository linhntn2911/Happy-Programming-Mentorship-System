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

export const mentorPlanService = {
  async getMyPlans() {
    const plans = await apiClient('/api/mentors/me/plans');
    return Array.isArray(plans) ? plans : [];
  },

  async saveMonthlyPlan(plan) {
    const headers = await withCsrf();
    return apiClient('/api/mentors/me/plans', {
      method: 'PUT',
      headers,
      body: JSON.stringify(plan),
    });
  },
};
