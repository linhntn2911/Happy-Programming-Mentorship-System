import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBankCode, buildTransferQrUrls, TransferQrPanel } from './TransferQrPanel.js';

test('normalizeBankCode handles common Vietnamese banks with and without accents', () => {
  assert.equal(normalizeBankCode('TP bank'), 'TPB');
  assert.equal(normalizeBankCode('Ngân hàng Tiên Phong'), 'TPB');
  assert.equal(normalizeBankCode('Vietcombank'), 'VCB');
  assert.equal(normalizeBankCode('Ngoại Thương'), 'VCB');
  assert.equal(normalizeBankCode('Techcombank'), 'TCB');
  assert.equal(normalizeBankCode('Kỹ Thương'), 'TCB');
  assert.equal(normalizeBankCode('MB Bank'), 'MB');
  assert.equal(normalizeBankCode('Quân Đội'), 'MB');
  assert.equal(normalizeBankCode('Sacombank'), 'STB');
  assert.equal(normalizeBankCode('BIDV'), 'BIDV');
  assert.equal(normalizeBankCode('Agribank'), 'VBA');
  assert.equal(normalizeBankCode('Nông Nghiệp'), 'VBA');
  assert.equal(normalizeBankCode('ACB'), 'ACB');
  assert.equal(normalizeBankCode('VPBank'), 'VPB');
  assert.equal(normalizeBankCode('Viettinbank'), 'ICB');
});

test('buildTransferQrUrls constructs valid VietQR and SePay URLs with exact amount', () => {
  const result = buildTransferQrUrls({
    bankName: 'TP bank',
    accountNumber: '00000806194',
    accountName: 'Nguyen Thi Ngoc Linh',
    amount: 5000,
    description: 'REFUND DISP-20261030-001',
  });

  assert.equal(result.bankCode, 'TPB');
  assert.equal(result.cleanAcc, '00000806194');
  assert.equal(result.cleanAmount, 5000);
  assert.match(result.vietQrUrl, /^https:\/\/img\.vietqr\.io\/image\/TPB-00000806194-compact2\.png\?amount=5000/);
  assert.match(result.sepayQrUrl, /^https:\/\/qr\.sepay\.vn\/img\?bank=TPB&acc=00000806194&template=compact&amount=5000/);
});

test('TransferQrPanel renders QR image, exact amount, and copy buttons', () => {
  const markup = TransferQrPanel({
    recipientLabel: 'Mentee',
    recipientName: 'Mentee Name',
    recipientEmail: 'mentee@example.test',
    amount: 5000,
    bankName: 'TP bank',
    accountNumber: '00000806194',
    accountName: 'Nguyen Thi Ngoc Linh',
    referenceCode: 'DISP-001',
    memoPrefix: 'REFUND',
    contextNote: 'Confirm that the bank transfer has been made.',
  });

  assert.match(markup, /<img/);
  assert.match(markup, /https:\/\/img\.vietqr\.io\/image\/TPB-00000806194/);
  assert.match(markup, /5\.000 VND/);
  assert.match(markup, /data-copy-text="00000806194"/);
  assert.match(markup, /data-copy-text="5000"/);
  assert.match(markup, /data-copy-text="REFUND DISP-001"/);
  assert.match(markup, /name="transferReference"/);
  assert.match(markup, /TP bank/);
});

test('TransferQrPanel displays fallback note when account number is missing or masked', () => {
  const markup = TransferQrPanel({
    recipientLabel: 'Mentor',
    recipientName: 'A Mentor',
    amount: 150000,
    bankName: 'MB Bank',
    accountNumber: '**** 1234',
    accountName: 'Tran Mentor',
  });

  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /missing or masked/);
  assert.match(markup, /\*\*\*\* 1234/);
});

test('TransferQrPanel renders receipt upload input and preview elements when showReceiptUpload is true', () => {
  const markup = TransferQrPanel({
    recipientLabel: 'Mentee',
    recipientName: 'Mentee Name',
    amount: 5000,
    bankName: 'TP bank',
    accountNumber: '00000806194',
    showReceiptUpload: true,
  });

  assert.match(markup, /id="admin-receipt-file"/);
  assert.match(markup, /id="receipt-preview-container"/);
  assert.match(markup, /id="receipt-preview-img"/);
});
