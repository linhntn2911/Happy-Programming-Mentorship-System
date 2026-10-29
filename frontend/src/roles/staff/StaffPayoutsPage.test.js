import test from 'node:test';
import assert from 'node:assert/strict';
import { StaffPayoutsPage } from './StaffPayoutsPage.js';

test('Staff payouts page escapes untrusted fields and provides decision actions', () => {
  const html = StaffPayoutsPage([{
    id: 42,
    mentorId: 15,
    mentorName: '<script>alert(1)</script>',
    mentorEmail: 'mentor@test.com',
    amount: 1500000,
    bankName: '<b onmouseover=evil()>Vietcombank</b>',
    accountName: 'Nguyen Van Mentor',
    accountNumber: '999888777',
    status: 'REQUESTED',
    requestedAt: '2026-10-15T10:00:00Z'
  }], { name: 'Staff User' });

  assert.match(html, /data-payout-approve="42"/);
  assert.doesNotMatch(html, /data-payout-paid/);
  assert.match(html, /data-payout-reject="42"/);
  assert.match(html, /data-copy="999888777"/);
  assert.match(html, /data-copy="1500000"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;b onmouseover=evil\(\)&gt;Vietcombank&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<b onmouseover/);
  assert.match(html, /1,500,000/);
});

test('Staff payouts page renders empty state when no pending payout requests', () => {
  const html = StaffPayoutsPage([], { name: 'Staff User' });
  assert.match(html, /No pending payouts/);
  assert.match(html, /New mentor withdrawal requests will appear here/);
});

test('VietQR helper builds standard Napas247 QR code URL and normalizes bank names', async () => {
  const { buildVietQrUrl, getVietQrBankCode } = await import('./vietQrHelper.js');

  assert.equal(getVietQrBankCode('TPBank'), 'tpbank');
  assert.equal(getVietQrBankCode('Vietcombank'), 'vietcombank');
  assert.equal(getVietQrBankCode('MB Bank'), 'mb');
  assert.equal(getVietQrBankCode('Techcombank'), 'techcombank');

  const url = buildVietQrUrl({
    bankName: 'TPBank',
    accountNumber: '00001234567',
    amount: 500000,
    memo: 'HPMS PAYOUT 12',
    accountName: 'Nguyen Van A'
  });

  assert.match(url, /^https:\/\/img\.vietqr\.io\/image\/tpbank-00001234567-compact2\.png/);
  assert.match(url, /amount=500000/);
  assert.match(url, /addInfo=HPMS\+PAYOUT\+12/);
  assert.match(url, /accountName=Nguyen\+Van\+A/);
});

