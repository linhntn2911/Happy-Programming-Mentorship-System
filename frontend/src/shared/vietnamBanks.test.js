import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIETNAM_BANKS, findMatchingBank, renderBankSelectOptions } from './vietnamBanks.js';

test('vietnamBanks contains popular banks with valid VietQR codes', () => {
  assert.ok(VIETNAM_BANKS.length >= 25);
  const tpb = VIETNAM_BANKS.find(b => b.code === 'TPB');
  assert.ok(tpb);
  assert.equal(tpb.shortName, 'TPBank');
});

test('findMatchingBank matches various user inputs to canonical banks', () => {
  assert.equal(findMatchingBank('TP Bank')?.code, 'TPB');
  assert.equal(findMatchingBank('tiên phong')?.code, 'TPB');
  assert.equal(findMatchingBank('Vietcombank')?.code, 'VCB');
  assert.equal(findMatchingBank('vcb')?.code, 'VCB');
  assert.equal(findMatchingBank('MB')?.code, 'MB');
  assert.equal(findMatchingBank('quân đội')?.code, 'MB');
  assert.equal(findMatchingBank('Techcombank')?.code, 'TCB');
  assert.equal(findMatchingBank('ACB')?.code, 'ACB');
  assert.equal(findMatchingBank('Unknown XYZ Bank'), null);
});

test('renderBankSelectOptions marks selected bank', () => {
  const html = renderBankSelectOptions('TP Bank');
  assert.match(html, /<option value="TPBank" selected>/);
  assert.match(html, /Other bank \(Enter manually\)/);
});
