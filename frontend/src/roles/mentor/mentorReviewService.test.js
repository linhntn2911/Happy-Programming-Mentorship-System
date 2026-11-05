import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorReviewService } from './mentorReviewService.js';

test('getMyReviews requests the paged mentor review endpoint and normalizes the payload', async t => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = {
      success: true,
      data: {
        averageRating: 4.5,
        reviewCount: 12,
        page: 2,
        pageSize: 5,
        items: [
          { id: 101, rating: 5, comment: 'Great mentor.', menteeName: 'Mentee A', sessionLabel: 'Monthly Mentorship', createdAt: '2026-10-10T03:15:00Z' },
        ],
      },
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await mentorReviewService.getMyReviews({ page: 2, size: 5 });

  assert.equal(calls[0].url, '/api/mentors/me/reviews?page=2&size=5');
  assert.equal(calls[0].options.method, undefined);
  assert.equal(result.reviewCount, 12);
  assert.equal(result.page, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].menteeName, 'Mentee A');
});

test('getMyReviews defaults to page 0 and size 10 and tolerates an empty response', async t => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ success: true, data: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await mentorReviewService.getMyReviews();

  assert.equal(calls[0], '/api/mentors/me/reviews?page=0&size=10');
  assert.equal(result.averageRating, null);
  assert.equal(result.reviewCount, 0);
  assert.deepEqual(result.items, []);
});
