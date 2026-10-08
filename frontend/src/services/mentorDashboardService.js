import { apiClient } from './apiClient.js';
import {
  developmentMentorDashboard,
  loadWithDevelopmentFallback,
} from './mentorDemoData.js';

const VALID_DECISIONS = new Set(['ACCEPTED', 'REJECTED']);

export const mentorDashboardService = {
  async getMyDashboard() {
    return loadWithDevelopmentFallback(
      () => apiClient('/api/mentors/me/dashboard'),
      developmentMentorDashboard
    );
  },

  async decideOnRequest(requestId, decision) {
    const normalizedRequestId = typeof requestId === 'number'
      ? requestId
      : typeof requestId === 'string' && /^[1-9]\d*$/.test(requestId)
        ? Number(requestId)
        : Number.NaN;
    if (!Number.isSafeInteger(normalizedRequestId) || normalizedRequestId <= 0) {
      throw new TypeError('Request ID must be a positive safe integer.');
    }
    if (!VALID_DECISIONS.has(decision)) {
      throw new TypeError('Decision must be ACCEPTED or REJECTED.');
    }
    return apiClient(`/api/mentors/me/requests/${normalizedRequestId}/decision`, {
      method: 'PUT',
      body: JSON.stringify({ decision }),
    });
  },
};
