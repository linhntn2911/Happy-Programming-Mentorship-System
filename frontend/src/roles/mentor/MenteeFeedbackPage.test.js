import test from 'node:test';
import assert from 'node:assert/strict';
import { MenteeFeedbackPage } from './MenteeFeedbackPage.js';

test('mentor feedback page renders the read-only mentee feedback section', () => {
  const html = MenteeFeedbackPage();
  assert.match(html, /MENTEE FEEDBACK/);
  assert.match(html, /id="feedback-summary"/);
  assert.match(html, /id="feedback-list"/);
  assert.match(html, /id="feedback-loading"/);
  assert.match(html, /id="feedback-empty"/);
  assert.match(html, /id="feedback-error"/);
  assert.match(html, /id="feedback-pagination"/);
  assert.match(html, /Reviews cannot be edited or deleted\./);
});

test('mentor feedback page keeps wallet finance blocks out of the feedback view', () => {
  const html = MenteeFeedbackPage();
  assert.doesNotMatch(html, /id="bank-form"/);
  assert.doesNotMatch(html, /id="payout-form"/);
  assert.doesNotMatch(html, /id="wallet-stats"/);
});
