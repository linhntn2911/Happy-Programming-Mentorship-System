import { apiClient } from '../../shared/apiClient.js';

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

export const reviewService = {
  async submitReview({ bookingId, rating, comment }) {
    const headers = await withCsrf();
    return apiClient('/api/reviews', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bookingId: Number(bookingId),
        rating: Number(rating),
        comment: String(comment || '').trim(),
      }),
    });
  },

  async getBookingReview(bookingId) {
    return apiClient(`/api/bookings/${encodeURIComponent(bookingId)}/review`);
  },

  async getMentorReviews(mentorIdentifier, limit = 10) {
    const reviews = await apiClient(`/api/mentors/${encodeURIComponent(mentorIdentifier)}/reviews?limit=${encodeURIComponent(limit)}`);
    return Array.isArray(reviews) ? reviews : [];
  },
};
