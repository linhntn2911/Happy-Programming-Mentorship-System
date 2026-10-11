import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWalletPage } from './MentorWalletPage.js';

test('mentor wallet page explains the hold, available funds and payout flow', () => {
  const html = MentorWalletPage();
  assert.match(html, /held for seven days/i);
  assert.match(html, /Requests reserve available balance/);
  assert.match(html, /Request a payout/);
  assert.match(html, /Account number/);
  assert.match(html, /encrypted before storage/);
});
