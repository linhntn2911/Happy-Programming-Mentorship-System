import { Button } from '../../shared/Button.js';
import { TextInput } from '../../shared/Input.js';

export function ChangePasswordForm({ success = false, preview = false } = {}) {
  if (success) {
    return `
    <div id="change-password-success" class="auth-form space-y-4 text-center">
      <div class="flex justify-center">
        <div class="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-2">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </div>
      <h2 class="text-xl font-semibold text-ink">Password changed successfully</h2>
      <p class="text-sm text-muted">Your account password has been updated. You can continue using your account securely.</p>
      <div class="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
        <a href="#/account" class="btn btn-primary inline-flex justify-center items-center">
          Go to my profile
        </a>
        <a href="#/" class="btn btn-outline inline-flex justify-center items-center">
          Back to homepage
        </a>
      </div>
    </div>`;
  }

  return `
  <form id="change-password-form" class="auth-form space-y-4" aria-describedby="change-password-feedback">
    <p class="text-xs text-muted mb-3">
      Enter your current password to verify your identity, then choose a new strong password.
    </p>

    ${TextInput({
      id: 'current-password',
      name: 'currentPassword',
      label: 'Current password',
      type: 'password',
      placeholder: '••••••••••••',
      required: true,
      className: 'auth-field',
      autocomplete: 'current-password',
      suffix: `
        <button type="button" class="toggle-password text-muted hover:text-brand transition-colors p-1" data-target="current-password" aria-label="Toggle password visibility">
          <svg class="auth-eye-show h-4 w-4" style="display: block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="auth-eye-hide h-4 w-4 hidden" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        </button>
      `
    })}

    <div>
      ${TextInput({
        id: 'new-password',
        name: 'newPassword',
        label: 'New password',
        type: 'password',
        placeholder: '••••••••••••',
        required: true,
        className: 'auth-field',
        autocomplete: 'new-password',
        maxLength: 72,
        suffix: `
          <button type="button" class="toggle-password text-muted hover:text-brand transition-colors p-1" data-target="new-password" aria-label="Toggle password visibility">
            <svg class="auth-eye-show h-4 w-4" style="display: block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="auth-eye-hide h-4 w-4 hidden" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          </button>
        `
      })}
      <ul class="auth-password-rules mt-1 text-xs space-y-1" aria-label="Password requirements">
        <li id="rule-min-length" class="text-muted">– Must be at least 8 characters</li>
        <li id="rule-lowercase" class="text-muted">– Must include one lowercase character</li>
        <li id="rule-uppercase" class="text-muted">– Must include one uppercase character</li>
      </ul>
    </div>

    ${TextInput({
      id: 'confirm-password',
      name: 'confirmPassword',
      label: 'Confirm new password',
      type: 'password',
      placeholder: '••••••••••••',
      required: true,
      className: 'auth-field',
      autocomplete: 'new-password',
      maxLength: 72,
      suffix: `
        <button type="button" class="toggle-password text-muted hover:text-brand transition-colors p-1" data-target="confirm-password" aria-label="Toggle password visibility">
          <svg class="auth-eye-show h-4 w-4" style="display: block;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="auth-eye-hide h-4 w-4 hidden" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        </button>
      `
    })}

    <p id="change-password-feedback" class="auth-feedback text-xs" role="alert" hidden></p>

    <div class="pt-2">
      ${Button({
        id: 'change-password-submit',
        label: 'Update password',
        type: 'submit',
        className: 'auth-submit w-full',
        disabled: preview
      })}
    </div>

    <div class="auth-links text-center pt-2">
      <p><a href="#/account" class="auth-link font-medium">Cancel and return to profile</a></p>
    </div>
  </form>`;
}

export function bindChangePasswordForm(root, { onSuccess = () => {} } = {}) {
  const form = root.querySelector('#change-password-form');
  if (!form) return;

  // Eye toggle handlers
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

  // Dynamic password rule indicators
  const newPwdInput = root.querySelector('#new-password');
  if (newPwdInput) {
    newPwdInput.addEventListener('input', () => {
      const val = newPwdInput.value;
      const ruleLength = root.querySelector('#rule-min-length');
      const ruleLower = root.querySelector('#rule-lowercase');
      const ruleUpper = root.querySelector('#rule-uppercase');

      const setRule = (el, valid) => {
        if (!el) return;
        if (valid) {
          el.className = 'text-emerald-600 font-medium';
          el.textContent = '✓ ' + el.textContent.replace(/^[–✓✕]\s*/, '');
        } else {
          el.className = 'text-muted';
          el.textContent = '– ' + el.textContent.replace(/^[–✓✕]\s*/, '');
        }
      };

      setRule(ruleLength, val.length >= 8);
      setRule(ruleLower, /[a-z]/.test(val));
      setRule(ruleUpper, /[A-Z]/.test(val));
    });
  }
}
