import test from 'node:test';
import assert from 'node:assert/strict';
import { SupportEmailLink } from './supportEmail.js';

test('support email markup starts hidden and never hardcodes an address', () => {
  const html = SupportEmailLink();
  assert.match(html, /data-support-email/);
  assert.match(html, /hidden/);
  assert.doesNotMatch(html, /mailto:/);
  assert.doesNotMatch(html, /support@/);
});
