import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationDisplayStatus, canPayApplication } from './applicationPayment.js';

test('only accepted and unfunded applications can open checkout', () => {
  assert.equal(canPayApplication({ status: 'PENDING', fundedAt: null }), false);
  assert.equal(canPayApplication({ status: 'REJECTED', fundedAt: null }), false);
  assert.equal(canPayApplication({ status: 'ACCEPTED', fundedAt: null }), true);
  assert.equal(canPayApplication({ status: 'ACCEPTED', fundedAt: '2026-10-10T10:00:00Z' }), false);
});

test('funded accepted applications are displayed as paid', () => {
  assert.equal(applicationDisplayStatus({ status: 'ACCEPTED', fundedAt: '2026-10-10T10:00:00Z' }), 'PAID');
  assert.equal(applicationDisplayStatus({ status: 'REJECTED', fundedAt: null }), 'REJECTED');
});
