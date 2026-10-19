import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDisputeDraft } from './MenteeDisputesPage.js';

const image = { type: 'image/png', size: 1024 };
const valid = {
  target: 'ONE_OFF:7', category: 'NO_SHOW',
  description: 'The mentor did not provide the agreed external meeting link at the scheduled time.',
  termsAccepted: true, evidence: [image],
};

test('accepts a complete dispute draft', () => {
  assert.equal(validateDisputeDraft(valid), '');
});

test('requires a 30-character description', () => {
  assert.match(validateDisputeDraft({ ...valid, description: 'Too short' }), /30/);
});

test('requires image evidence and authenticity confirmation', () => {
  assert.match(validateDisputeDraft({ ...valid, evidence: [] }), /1 and 5/);
  assert.match(validateDisputeDraft({ ...valid, termsAccepted: false }), /authentic/);
});

test('rejects unsupported or oversized evidence', () => {
  assert.match(validateDisputeDraft({ ...valid, evidence: [{ type: 'application/pdf', size: 10 }] }), /PNG/);
  assert.match(validateDisputeDraft({ ...valid, evidence: [{ type: 'image/png', size: 6 * 1024 * 1024 }] }), /5 MB/);
});
