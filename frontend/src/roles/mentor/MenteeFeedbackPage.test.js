import test from 'node:test';
import assert from 'node:assert/strict';
import { MenteeFeedbackPage } from './MenteeFeedbackPage.js';

test('mentor feedback page renders the read-only mentee feedback section', () => {
  const html = MenteeFeedbackPage();
  assert.match(html, /MENTEE FEEDBACK/);
  assert.match(html, /id="feedback-summary"/);
  assert.match(html, /id="feedback-list"/);
  assert.match(html, /id="feedback-table-wrap"/);
  assert.match(html, /id="feedback-rows"/);
  assert.match(html, /<th[^>]*>Mentee<\/th>/);
  assert.match(html, /<th[^>]*>Rating<\/th>/);
  assert.match(html, /id="feedback-loading"/);
  assert.match(html, /id="feedback-empty"/);
  assert.match(html, /id="feedback-error"/);
  assert.match(html, /id="feedback-pagination"/);
  assert.match(html, /Reviews cannot be edited or deleted\./);
});

test('mentor feedback page exposes search, rating and package filters', () => {
  const html = MenteeFeedbackPage();
  assert.match(html, /id="feedback-toolbar"/);
  assert.match(html, /id="feedback-search"/);
  assert.match(html, /id="feedback-rating-filter"/);
  assert.match(html, /id="feedback-package-filter"/);
  assert.match(html, /<option value="MONTHLY">Monthly<\/option>/);
  assert.match(html, /<option value="ONE_OFF">One-off<\/option>/);
  assert.match(html, /id="feedback-result-count"/);
});

test('mentor feedback page keeps the filter toolbar visible with a polished empty state', () => {
  const html = MenteeFeedbackPage();
  // Toolbar must never carry a static hidden attribute so filters stay reachable at 0 reviews.
  assert.match(html, /id="feedback-toolbar"(?![^>]*hidden)/);
  assert.match(html, /id="feedback-empty"[^>]*hidden/);
  assert.match(html, /id="feedback-empty-detail"/);
  assert.match(html, /No mentee reviews yet/);
});

test('mentor feedback page keeps wallet finance blocks out of the feedback view', () => {
  const html = MenteeFeedbackPage();
  assert.doesNotMatch(html, /id="bank-form"/);
  assert.doesNotMatch(html, /id="payout-form"/);
  assert.doesNotMatch(html, /id="wallet-stats"/);
});
