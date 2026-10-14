import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWalletPage } from './MentorWalletPage.js';

test('mentor wallet page explains the hold, available funds and payout flow', () => {
  const html = MentorWalletPage();
  assert.match(html, /MENTOR EARNINGS/);
  assert.match(html, /Wallet and payouts/);
  assert.match(html, /Verified payments are held for seven days before becoming available to withdraw\./);
  assert.match(html, /Requests reserve available balance until the admin records payment or rejection\./);
  assert.match(html, /Request a payout/);
  assert.match(html, /Account number/);
  assert.match(html, /encrypted before storage/);
  assert.match(html, /id="toast"/);
});

test('mentor wallet page exposes saved bank account management and OTP verification', () => {
  const html = MentorWalletPage();
  assert.match(html, /id="bank-form"/);
  assert.match(html, /id="bank-current"/);
  assert.match(html, /Save bank account/);
  assert.match(html, /id="payout-otp-dialog"/);
  assert.match(html, /id="payout-otp-form"/);
  assert.match(html, /name="otp"[^>]*pattern="\[0-9\]\{6\}"/);
  assert.match(html, /Confirm withdrawal/);
  assert.match(html, /Resend code/);
});

