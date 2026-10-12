import test from 'node:test';
import assert from 'node:assert/strict';
import { ForgotPasswordForm } from './ForgotPasswordForm.js';
import { LoginForm } from './LoginForm.js';

test('LoginForm links to #/forgot-password', () => {
  const markup = LoginForm();
  assert.match(markup, /href="#\/forgot-password"/);
  assert.match(markup, /Forgot password\?/);
});

test('ForgotPasswordForm renders Step 1 email input', () => {
  const markup = ForgotPasswordForm({ step: 1 });
  assert.match(markup, /id="forgot-email"/);
  assert.match(markup, /id="forgot-submit"/);
  assert.match(markup, /href="#\/login"/);
});

test('ForgotPasswordForm renders Step 2 with code and password fields', () => {
  const markup = ForgotPasswordForm({ step: 2, email: 'test@example.com' });
  assert.match(markup, /id="reset-code"/);
  assert.match(markup, /id="reset-password"/);
  assert.match(markup, /id="reset-confirm-password"/);
  assert.match(markup, /id="resend-code-btn"/);
  assert.match(markup, /test@example\.com/);
});

test('ForgotPasswordForm renders Step 3 success state', () => {
  const markup = ForgotPasswordForm({ step: 3 });
  assert.match(markup, /Password reset successful/);
  assert.match(markup, /href="#\/login"/);
});
