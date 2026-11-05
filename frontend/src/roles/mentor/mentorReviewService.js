import { apiClient } from '../../shared/apiClient.js';

export const mentorReviewService = {
  async getMyReviews({ page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const data = await apiClient(`/api/mentors/me/reviews?${params.toString()}`);
    return {
      averageRating: data?.averageRating ?? null,
      reviewCount: Number(data?.reviewCount || 0),
      page: Number(data?.page || 0),
      pageSize: Number(data?.pageSize || size),
      items: Array.isArray(data?.items) ? data.items : [],
    };
  },
};
