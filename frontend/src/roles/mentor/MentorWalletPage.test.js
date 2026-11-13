import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorWalletPage, renderPayouts } from './MentorWalletPage.js';

test('mentor wallet page explains the hold, available funds and payout flow', () => {
  const html = MentorWalletPage();
  assert.match(html, /MENTOR WALLET &amp; EARNINGS/);
  assert.match(html, /Wallet and earnings/);
  assert.match(html, /Verified earnings become available after the hold period recorded when payment is confirmed/);
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

test('mentor wallet page no longer embeds the mentee feedback section', () => {
  const html = MentorWalletPage();
  assert.doesNotMatch(html, /MENTEE FEEDBACK/);
  assert.doesNotMatch(html, /id="feedback-summary"/);
  assert.doesNotMatch(html, /id="feedback-list"/);
  assert.match(html, /id="wallet-stats"/);
  assert.match(html, /id="wallet-entries"/);
  assert.match(html, /id="payout-history"/);
});

const payout = overrides => ({
  id: 5, amount: 500000, bankName: 'Vietcombank', accountName: 'NGUYEN VAN A', accountLast4: '4321',
  status: 'REQUESTED', transferReference: null, receiptUrl: null, rejectionReason: null,
  requestedAt: '2026-11-01T02:00:00Z', reviewedAt: null, ...overrides,
});

test('payout history labels a requested payout as pending review', () => {
  const html = renderPayouts([payout()]);
  assert.match(html, /<th>Receipt<\/th>/);
  assert.match(html, /status-badge status-warning/);
  assert.match(html, /Pending review/);
  assert.doesNotMatch(html, />REQUESTED</);
});

test('payout history links the receipt image once a payout is paid', () => {
  const html = renderPayouts([payout({
    status: 'PAID', transferReference: 'FT20261102001',
    receiptUrl: 'https://cdn.happyprogramming.test/receipts/5.png',
    reviewedAt: '2026-11-02T02:00:00Z',
  })]);
  assert.match(html, /status-badge status-success/);
  assert.match(html, /Paid<\/span>/);
  assert.match(html, /FT20261102001/);
  assert.match(html, /<a[^>]+href="https:\/\/cdn\.happyprogramming\.test\/receipts\/5\.png"[^>]*>View receipt<\/a>/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('payout history shows a rejected payout without a receipt link', () => {
  const html = renderPayouts([payout({ status: 'REJECTED', rejectionReason: 'Bank account name mismatch.' })]);
  assert.match(html, /status-badge status-danger/);
  assert.match(html, /Rejected<\/span>/);
  assert.match(html, /Bank account name mismatch\./);
  assert.doesNotMatch(html, /View receipt/);
});

test('payout history ignores a receipt link that is not http(s)', () => {
  const html = renderPayouts([payout({ status: 'PAID', receiptUrl: 'javascript:alert(1)' })]);
  assert.doesNotMatch(html, /javascript:alert\(1\)/);
  assert.doesNotMatch(html, /View receipt/);
});

test('payout history keeps its empty state', () => {
  assert.match(renderPayouts([]), /No payout requests yet\./);
});
