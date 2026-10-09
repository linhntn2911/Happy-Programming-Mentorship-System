import { MenteeSignupForm, bindMenteeSignupEvents } from '../components/auth/MenteeSignupForm.js';
import { OtpVerificationForm } from '../components/auth/OtpVerificationForm.js';
import { AuthShell } from './LoginPage.js';
import { authService } from '../services/authService.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export function mountMenteeSignup(root) {
  document.title = 'Sign up as a mentee | HappyProgramming';

  function renderSignup() {
    root.innerHTML = AuthShell(`
      <h1 class="font-display auth-title" id="auth-main-title">Sign up as a mentee</h1>
      <div id="auth-flow-container">
        ${MenteeSignupForm()}
      </div>
    `);

    bindMenteeSignupEvents(root);

    const form = root.querySelector('#mentee-signup-form');
    const feedback = form.querySelector('#signup-feedback');
    const submit = form.querySelector('#signup-submit');
    const google = form.querySelector('#google-signup');
    let busy = false;
    let googleEnabled = false;

    const showError = message => {
      feedback.textContent = message;
      feedback.hidden = false;
    };

    const setBusy = value => {
      busy = value;
      form.setAttribute('aria-busy', String(value));
      submit.disabled = value;
      submit.textContent = value ? 'Signing up…' : 'Sign up';
      form.querySelectorAll('input').forEach(input => { input.disabled = value; });
    };

    authService.options().then(options => {
      if (!form.isConnected) return;
      googleEnabled = Boolean(options?.googleEnabled);
    }).catch(() => {
      googleEnabled = false;
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;

      const fields = new FormData(form);
      const firstName = fields.get('firstName')?.trim();
      const lastName = fields.get('lastName')?.trim();
      const email = fields.get('email')?.trim();
      const password = fields.get('password');

      feedback.hidden = true;
      setBusy(true);

      try {
        const response = await authService.signupMentee({ firstName, lastName, email, password });
        if (response?.requiresVerification) {
          renderOtp(email);
        } else {
          location.hash = '#/';
        }
      } catch (error) {
        if (form.isConnected) {
          showError(error instanceof TypeError ? 'Unable to connect. Please check your connection and try again.' : error.message);
        }
      } finally {
        if (form.isConnected) setBusy(false);
      }
    });

    google.addEventListener('click', async () => {
      if (busy) return;
      if (!googleEnabled) {
        showError('Google sign-up is not available. Please sign up using email and password.');
        return;
      }
      setBusy(true);
      try {
        const result = await authService.google('MENTEE');
        if (form.isConnected && result.url === '/oauth2/authorization/google') {
          location.assign(result.url);
        }
      } catch (error) {
        if (form.isConnected) {
          showError(error.message);
          setBusy(false);
        }
      }
    });
  }

  function renderOtp(email) {
    const title = root.querySelector('#auth-main-title');
    if (title) title.textContent = 'Check your email';

    const container = root.querySelector('#auth-flow-container');
    if (!container) return;

    container.innerHTML = OtpVerificationForm({ email });

    const otpForm = container.querySelector('#otp-form');
    const otpInput = otpForm.querySelector('#otp-code');
    const otpFeedback = otpForm.querySelector('#otp-feedback');
    const otpSuccess = otpForm.querySelector('#otp-success');
    const otpSubmit = otpForm.querySelector('#otp-submit');
    const resendBtn = otpForm.querySelector('#resend-otp-btn');
    const resendTimer = otpForm.querySelector('#resend-timer');
    const backBtn = otpForm.querySelector('#back-to-signup-btn');

    let busy = false;
    let cooldown = 60;
    let timerId = null;

    function startCooldown() {
      cooldown = 60;
      resendBtn.disabled = true;
      resendBtn.classList.add('opacity-50', 'pointer-events-none');
      resendTimer.classList.remove('hidden');
      resendTimer.textContent = `(${cooldown}s)`;

      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        cooldown -= 1;
        if (cooldown <= 0) {
          clearInterval(timerId);
          resendBtn.disabled = false;
          resendBtn.classList.remove('opacity-50', 'pointer-events-none');
          resendTimer.classList.add('hidden');
        } else {
          resendTimer.textContent = `(${cooldown}s)`;
        }
      }, 1000);
    }

    startCooldown();

    otpInput.focus();

    otpForm.addEventListener('submit', async e => {
      e.preventDefault();
      const code = otpInput.value.trim();
      if (!code || code.length !== 6 || busy) return;

      busy = true;
      otpSubmit.disabled = true;
      otpSubmit.textContent = 'Verifying…';
      otpFeedback.hidden = true;
      otpSuccess.hidden = true;

      try {
        const user = await authService.verifyOtp({ email, code });
        if (timerId) clearInterval(timerId);
        renderSuccess(user);
      } catch (err) {
        otpFeedback.textContent = err.message || 'Verification failed. Please try again.';
        otpFeedback.hidden = false;
        otpInput.select();
      } finally {
        busy = false;
        otpSubmit.disabled = false;
        otpSubmit.textContent = 'Verify and activate';
      }
    });

    resendBtn.addEventListener('click', async () => {
      if (resendBtn.disabled || busy) return;
      otpFeedback.hidden = true;
      otpSuccess.hidden = true;
      try {
        await authService.resendOtp({ email });
        otpSuccess.textContent = 'A fresh 6-digit code has been sent to your email!';
        otpSuccess.hidden = false;
        startCooldown();
      } catch (err) {
        otpFeedback.textContent = err.message || 'Unable to resend code. Please try again later.';
        otpFeedback.hidden = false;
      }
    });

    backBtn.addEventListener('click', () => {
      if (timerId) clearInterval(timerId);
      renderSignup();
    });
  }

  function renderSuccess(user) {
    document.title = 'Registration successful | HappyProgramming';
    const title = root.querySelector('#auth-main-title');
    if (title) title.textContent = 'Welcome aboard!';

    const container = root.querySelector('#auth-flow-container');
    if (!container) return;

    const displayName = user?.name || user?.email || 'there';

    container.innerHTML = `
      <div class="space-y-6 text-center animate-fade-in" id="signup-success-view">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 shadow-sm">
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Registration successful!</h2>
          <p class="text-sm leading-relaxed text-muted">
            Welcome, <strong class="font-semibold text-ink">${escapeHtml(displayName)}</strong>! Your mentee account is now active and ready to use.
          </p>
        </div>

        <div class="rounded-xl border border-line bg-lilac/30 p-4 text-left">
          <div class="flex items-start gap-3">
            <span class="mt-0.5 text-brand shrink-0">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </span>
            <div class="text-xs leading-5 text-ink">
              <p class="font-semibold text-brand">Email verified successfully</p>
              <p class="text-muted mt-0.5">You are now logged in. You can browse mentors, submit mentorship requests, or access your account profile anytime.</p>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <a href="#/" id="btn-back-home" class="auth-submit block text-center !no-underline shadow-md hover:shadow-lg transition-all" aria-label="Back to homepage">
            Back to homepage
          </a>
        </div>
      </div>
    `;
  }

  renderSignup();
}
