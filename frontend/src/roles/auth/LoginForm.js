import { Button } from '../../shared/Button.js';
import { TextInput } from '../../shared/Input.js';

export function LoginForm({ preview = false } = {}) {
  return `
  <form id="login-form" class="auth-form" aria-describedby="login-feedback">
    ${TextInput({
      id: 'login-email',
      name: 'email',
      label: 'Email address',
      type: 'email',
      placeholder: 'name@example.com',
      required: true,
      className: 'auth-field',
      autocomplete: 'username',
      maxLength: 254
    })}

    ${TextInput({
      id: 'login-password',
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: '••••••••••••',
      required: true,
      className: 'auth-field',
      autocomplete: 'current-password',
      maxLength: 128,
      suffix: `
        <button type="button" id="toggle-password" class="auth-password-toggle text-muted hover:text-brand transition-colors p-1" aria-label="Toggle password visibility" title="Show password">
          <svg class="auth-eye-show h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="auth-eye-hide h-4 w-4 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
        </button>
      `
    })}

    <p id="login-feedback" class="auth-feedback" role="alert" hidden></p>

    ${Button({
      id: 'login-submit',
      label: 'Log in',
      type: 'submit',
      className: 'auth-submit',
      disabled: preview
    })}

    <div class="auth-divider"><span>Or</span></div>

    ${Button({
      id: 'google-login',
      label: 'Log in with Google',
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

    <p id="google-status" class="auth-hint">${preview ? 'Google sign-in is not configured for this environment.' : 'Checking Google sign-in availability…'}</p>

    <div class="auth-links">
      <button type="button" data-auth-info="recovery" class="auth-link">Forgot password?</button>
      <p>Don't have an account?<br><a href="#/signup/mentee" class="auth-link font-medium">Sign up as a mentee</a> or <a href="#/apply/mentor" class="auth-link font-medium">apply to be a mentor</a></p>
      <p id="auth-info" role="status" class="auth-hint auth-info-box" hidden></p>
    </div>
  </form>`;
}

export function bindAuthInfo(root) {
  root.querySelectorAll('[data-auth-info]').forEach(button => button.addEventListener('click', () => {
    const message = root.querySelector('#auth-info');
    if (!message) return;
    const copy = {
      recovery: 'Password recovery is not available yet. Please contact the platform team for account assistance.',
      mentee: 'Mentee registration is not open yet. You can log in if you already have an account.',
      mentor: 'Mentor applications are not open yet. Existing approved mentors can log in above.'
    };
    message.textContent = copy[button.dataset.authInfo];
    message.hidden = false;
  }));

  const toggleBtn = root.querySelector('#toggle-password');
  const pwdInput = root.querySelector('#login-password');
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
      toggleBtn.setAttribute('title', isPwd ? 'Hide password' : 'Show password');
      const showEye = toggleBtn.querySelector('.auth-eye-show');
      const hideEye = toggleBtn.querySelector('.auth-eye-hide');
      if (showEye && hideEye) {
        showEye.classList.toggle('hidden', isPwd);
        hideEye.classList.toggle('hidden', !isPwd);
      }
    });
  }
}
