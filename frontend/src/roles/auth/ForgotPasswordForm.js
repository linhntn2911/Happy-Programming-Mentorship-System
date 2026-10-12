import { Button } from '../../shared/Button.js';
import { TextInput } from '../../shared/Input.js';

export function ForgotPasswordForm({ step = 1, email = '', preview = false } = {}) {
  if (step === 3) {
    return `
    <div id="forgot-password-success" class="auth-form space-y-4 text-center">
      <div class="flex justify-center">
        <div class="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-2">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </div>
      <h2 class="text-xl font-semibold text-ink">Password reset successful</h2>
      <p class="text-sm text-muted">Your password has been securely updated. You can now sign in with your new password.</p>
      <div class="pt-4">
        <a href="#/login" class="btn btn-primary w-full inline-flex justify-center items-center">
          Go to Log in
        </a>
      </div>
    </div>`;
  }

  if (step === 2) {
    return `
    <form id="reset-password-form" class="auth-form" aria-describedby="reset-feedback">
      <div class="p-3 bg-lilac/30 rounded-lg text-xs text-muted mb-2">
        We sent a 6-digit reset code to <strong class="text-ink">${email}</strong>. Enter it below along with your new password.
      </div>

      <input type="hidden" name="email" value="${email}">

      ${TextInput({
        id: 'reset-code',
        name: 'code',
        label: '6-digit verification code',
        type: 'text',
        placeholder: '123456',
        required: true,
        className: 'auth-field',
        maxLength: 6,
        autocomplete: 'one-time-code'
      })}

      ${TextInput({
        id: 'reset-password',
        name: 'newPassword',
        label: 'New password',
        type: 'password',
        placeholder: '••••••••••••',
        required: true,
        className: 'auth-field',
        autocomplete: 'new-password',
        maxLength: 128,
        suffix: `
          <button type="button" class="toggle-password text-muted hover:text-brand transition-colors p-1" data-target="reset-password" aria-label="Toggle password visibility">
            <svg class="auth-eye-show h-4 w-4" style="display: block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="auth-eye-hide h-4 w-4 hidden" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          </button>
        `
      })}

      ${TextInput({
        id: 'reset-confirm-password',
        name: 'confirmPassword',
        label: 'Confirm new password',
        type: 'password',
        placeholder: '••••••••••••',
        required: true,
        className: 'auth-field',
        autocomplete: 'new-password',
        maxLength: 128,
        suffix: `
          <button type="button" class="toggle-password text-muted hover:text-brand transition-colors p-1" data-target="reset-confirm-password" aria-label="Toggle password visibility">
            <svg class="auth-eye-show h-4 w-4" style="display: block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="auth-eye-hide h-4 w-4 hidden" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          </button>
        `
      })}

      <p id="reset-feedback" class="auth-feedback" role="alert" hidden></p>

      ${Button({
        id: 'reset-submit',
        label: 'Set new password',
        type: 'submit',
        className: 'auth-submit',
        disabled: preview
      })}

      <div class="flex items-center justify-between text-xs text-muted pt-2">
        <button type="button" id="resend-code-btn" class="auth-link font-medium">Resend reset code</button>
        <button type="button" id="change-email-btn" class="auth-link font-medium">Use a different email</button>
      </div>

      <div class="auth-links">
        <p><a href="#/login" class="auth-link font-medium">Return to Log in</a></p>
      </div>
    </form>`;
  }

  return `
  <form id="forgot-password-form" class="auth-form" aria-describedby="forgot-feedback">
    <p class="text-sm text-muted mb-4">
      Enter your registered email address and we will send you a 6-digit code to reset your password.
    </p>

    ${TextInput({
      id: 'forgot-email',
      name: 'email',
      label: 'Email address',
      type: 'email',
      placeholder: 'name@example.com',
      required: true,
      className: 'auth-field',
      autocomplete: 'username',
      maxLength: 254,
      value: email
    })}

    <p id="forgot-feedback" class="auth-feedback" role="alert" hidden></p>

    ${Button({
      id: 'forgot-submit',
      label: 'Send reset code',
      type: 'submit',
      className: 'auth-submit',
      disabled: preview
    })}

    <div class="auth-links">
      <p>Remember your password? <a href="#/login" class="auth-link font-medium">Back to Log in</a></p>
    </div>
  </form>`;
}

export function bindPasswordToggle(root) {
  root.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = root.querySelector('#' + targetId);
      if (!input) return;
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
      const showEye = btn.querySelector('.auth-eye-show');
      const hideEye = btn.querySelector('.auth-eye-hide');
      if (showEye && hideEye) {
        showEye.style.display = isPwd ? 'none' : 'block';
        hideEye.style.display = isPwd ? 'block' : 'none';
        showEye.classList.toggle('hidden', isPwd);
        hideEye.classList.toggle('hidden', !isPwd);
      }
    });
  });
}
