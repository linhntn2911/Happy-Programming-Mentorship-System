import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangePasswordForm } from './ChangePasswordForm.js';
import { renderUserDropdown } from '../../shared/Header.js';

test('ChangePasswordForm renders current, new, and confirm password fields', () => {
  const markup = ChangePasswordForm();
  assert.match(markup, /id="current-password"/);
  assert.match(markup, /id="new-password"/);
  assert.match(markup, /id="confirm-password"/);
  assert.match(markup, /id="change-password-submit"/);
  assert.match(markup, /id="rule-min-length"/);
  assert.match(markup, /id="rule-lowercase"/);
  assert.match(markup, /id="rule-uppercase"/);
  assert.match(markup, /href="#\/account"/);
});

test('ChangePasswordForm renders success state when success is true', () => {
  const markup = ChangePasswordForm({ success: true });
  assert.match(markup, /Password changed successfully/);
  assert.match(markup, /href="#\/account"/);
  assert.match(markup, /href="#\/"/);
});

test('Header user dropdown includes link to #/change-password', () => {
  const markup = renderUserDropdown({
    currentUser: { email: 'alice@example.com', role: 'MENTEE' },
    displayName: 'Alice User',
    initials: 'AU'
  });
  assert.match(markup, /href="#\/change-password"/);
  assert.match(markup, /Change password/);
});
