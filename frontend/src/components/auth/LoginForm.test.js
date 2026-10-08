import test from 'node:test';
import assert from 'node:assert/strict';
import { LoginForm } from './LoginForm.js';

test('Google sign-in button is available for runtime configuration to enable', () => {
  const markup = LoginForm();
  const button = markup.match(/<button[^>]*id="google-login"[^>]*>/)?.[0];

  assert.ok(button);
  assert.doesNotMatch(button, /\sdisabled(?:\s|=|>)/);
  assert.match(markup, /Checking Google sign-in availability/);
});
