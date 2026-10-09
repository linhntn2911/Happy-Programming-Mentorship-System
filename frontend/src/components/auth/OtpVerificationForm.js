import { Button } from '../ui/Button.js';

export function OtpVerificationForm({ email = '' } = {}) {
  return `
  <div class="space-y-6">
    <div class="text-center space-y-2">
      <div class="mx-auto w-12 h-12 rounded-2xl bg-lilac text-brand grid place-items-center mb-3">
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      </div>
      <p class="text-sm text-muted">
        We sent a 6-digit verification code to<br>
        <strong id="otp-target-email" class="text-ink font-semibold">${email}</strong>
      </p>
    </div>

    <form id="otp-form" class="auth-form" aria-describedby="otp-feedback">
      <input type="hidden" name="email" value="${email}">

      <div class="auth-field space-y-2">
        <label for="otp-code" class="block text-xs font-semibold text-ink text-center">Enter 6-digit code</label>
        <input
          type="text"
          id="otp-code"
          name="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="••••••"
          required
          autofocus
          class="auth-otp-input"
        />
      </div>

      <p id="otp-feedback" class="auth-feedback" role="alert" hidden></p>
      <p id="otp-success" class="auth-info-box" role="status" hidden></p>

      ${Button({
        id: 'otp-submit',
        label: 'Verify and activate',
        type: 'submit',
        className: 'auth-submit'
      })}

      <div class="text-center space-y-3 pt-2">
        <p class="text-xs text-muted">
          Didn't receive the email?
          <button type="button" id="resend-otp-btn" class="auth-link font-medium inline-block ml-1">Resend code</button>
          <span id="resend-timer" class="text-muted text-xs hidden ml-1"></span>
        </p>

        <button type="button" id="back-to-signup-btn" class="auth-link text-xs text-muted hover:text-brand">
          ← Re-enter email / details
        </button>
      </div>
    </form>
  </div>`;
}
