import { Button } from '../ui/Button.js';
import { TextInput } from '../ui/Input.js';

export function MenteeSignupForm({ preview = false } = {}) {
  return `
  <form id="mentee-signup-form" class="auth-form" aria-describedby="signup-feedback">
    ${TextInput({
      id: 'signup-first-name',
      name: 'firstName',
      label: 'First name',
      type: 'text',
      placeholder: 'First name',
      required: true,
      className: 'auth-field',
      autocomplete: 'given-name',
      maxLength: 75
    })}

    ${TextInput({
      id: 'signup-last-name',
      name: 'lastName',
      label: 'Last name',
      type: 'text',
      placeholder: 'Last name',
      required: true,
      className: 'auth-field',
      autocomplete: 'family-name',
      maxLength: 75
    })}

    ${TextInput({
      id: 'signup-email',
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'you@example.com',
      required: true,
      className: 'auth-field',
      autocomplete: 'email',
      maxLength: 254
    })}

    <div class="auth-field">
      <div class="flex items-center justify-between mb-1">
        <label for="signup-password" class="!mb-0">Password <span class="text-red-500">*</span></label>
        <button type="button" id="toggle-signup-password" class="auth-password-toggle-text text-xs font-medium hover:underline inline-flex items-center gap-1" aria-label="Show password">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span id="toggle-password-label">Show</span>
        </button>
      </div>
      <input
        type="password"
        id="signup-password"
        name="password"
        placeholder="••••••••••••"
        required
        autocomplete="new-password"
        maxlength="128"
        class="w-full"
      />
      <ul class="auth-password-rules" aria-label="Password requirements">
        <li id="rule-min-length">– Must be at least 8 characters</li>
        <li id="rule-lowercase">– Must include one lowercase character</li>
        <li id="rule-uppercase">– Must include one uppercase character</li>
        <li id="rule-not-common">– Can't be too common</li>
      </ul>
    </div>

    <p id="signup-feedback" class="auth-feedback" role="alert" hidden></p>

    ${Button({
      id: 'signup-submit',
      label: 'Sign up',
      type: 'submit',
      className: 'auth-submit',
      disabled: preview
    })}

    <div class="auth-divider"><span>Or</span></div>

    ${Button({
      id: 'google-signup',
      label: 'Sign up with Google',
      variant: 'outline',
      className: 'auth-google',
      disabled: false,
      icon: `
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
      `
    })}

    <div class="auth-links text-center">
      <p>Already have an account? <a href="#/login" class="auth-link font-medium">Log in</a></p>
    </div>
  </form>`;
}

export function bindMenteeSignupEvents(root) {
  const toggleBtn = root.querySelector('#toggle-signup-password');
  const pwdInput = root.querySelector('#signup-password');
  const label = root.querySelector('#toggle-password-label');
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      if (label) label.textContent = isPwd ? 'Hide' : 'Show';
      toggleBtn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
    });
  }

  // Dynamic password rule check styling
  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      const ruleLength = root.querySelector('#rule-min-length');
      const ruleLower = root.querySelector('#rule-lowercase');
      const ruleUpper = root.querySelector('#rule-uppercase');

      if (ruleLength) ruleLength.classList.toggle('text-emerald-600', val.length >= 8);
      if (ruleLower) ruleLower.classList.toggle('text-emerald-600', /[a-z]/.test(val));
      if (ruleUpper) ruleUpper.classList.toggle('text-emerald-600', /[A-Z]/.test(val));
    });
  }
}
