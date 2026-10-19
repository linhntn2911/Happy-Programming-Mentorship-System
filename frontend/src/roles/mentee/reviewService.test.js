import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { reviewService } from './reviewService.js';

describe('reviewService', () => {
  it('submits review with parsed numeric bookingId and rating', async () => {
    const originalFetch = globalThis.fetch;
    let requestBody = null;
    let requestMethod = null;
    let requestUrl = null;

    globalThis.fetch = mock.fn(async (url, init) => {
      if (url === '/api/auth/csrf') {
        return {
          ok: true,
          json: async () => ({ headerName: 'X-CSRF-TOKEN', token: 'csrf-123' }),
        };
      }
      requestUrl = url;
      requestMethod = init?.method;
      requestBody = JSON.parse(init?.body || '{}');
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 1, bookingId: 10, rating: 5, comment: 'Great session!' },
        }),
      };
    });

    try {
      const res = await reviewService.submitReview({
        bookingId: '10',
        rating: '5',
        comment: '  Great session!  ',
      });

      assert.equal(requestUrl, '/api/reviews');
      assert.equal(requestMethod, 'POST');
      assert.deepEqual(requestBody, {
        bookingId: 10,
        rating: 5,
        comment: 'Great session!',
      });
      assert.equal(res.id, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetches mentor reviews array', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async url => {
      if (url.includes('/api/mentors/jane/reviews')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 1, rating: 5, comment: 'Awesome!' }],
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    try {
      const reviews = await reviewService.getMentorReviews('jane');
      assert.equal(reviews.length, 1);
      assert.equal(reviews[0].rating, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
