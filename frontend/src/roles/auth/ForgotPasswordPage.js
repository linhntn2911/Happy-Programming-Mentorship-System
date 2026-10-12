import { AuthShell } from './LoginPage.js';
import { ForgotPasswordForm, bindPasswordToggle } from './ForgotPasswordForm.js';
import { authService } from './authService.js';

export function mountForgotPassword(root) {
  document.title = 'Forgot Password | HappyProgramming';

  let currentStep = 1;
  let userEmail = '';
  let busy = false;

  function render() {
    root.innerHTML = AuthShell(`
      <h1 class="font-display auth-title" id="auth-main-title">
        ${currentStep === 3 ? 'Password Updated' : currentStep === 2 ? 'Enter Reset Code' : 'Forgot Password'}
      </h1>
      <div id="forgot-flow-container">
        ${ForgotPasswordForm({ step: currentStep, email: userEmail })}
      </div>
    `);

    if (currentStep === 1) {
      bindStep1();
    } else if (currentStep === 2) {
      bindStep2();
    }
  }

  function bindStep1() {
    const form = root.querySelector('#forgot-password-form');
    if (!form) return;
    const feedback = form.querySelector('#forgot-feedback');
    const submit = form.querySelector('#forgot-submit');
    const emailInput = form.querySelector('#forgot-email');

    const showError = msg => {
      feedback.textContent = msg;
      feedback.className = 'auth-feedback text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs';
      feedback.hidden = false;
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;

      const email = emailInput.value.trim();
      if (!email) {
        showError('Please enter your email address.');
        return;
      }

      busy = true;
      submit.disabled = true;
      submit.textContent = 'Sending code…';
      feedback.hidden = true;

      try {
        await authService.forgotPassword({ email });
        userEmail = email;
        currentStep = 2;
        render();
      } catch (err) {
        showError(err.message || 'Unable to process reset request. Please try again.');
      } finally {
        busy = false;
        if (submit) {
          submit.disabled = false;
          submit.textContent = 'Send reset code';
        }
      }
    });
  }

  function bindStep2() {
    bindPasswordToggle(root);
    const form = root.querySelector('#reset-password-form');
    if (!form) return;
    const feedback = form.querySelector('#reset-feedback');
    const submit = form.querySelector('#reset-submit');
    const resendBtn = root.querySelector('#resend-code-btn');
    const changeEmailBtn = root.querySelector('#change-email-btn');

    const showError = msg => {
      feedback.textContent = msg;
      feedback.className = 'auth-feedback text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs';
      feedback.hidden = false;
    };

    const showSuccess = msg => {
      feedback.textContent = msg;
      feedback.className = 'auth-feedback text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs';
      feedback.hidden = false;
    };

    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        resendBtn.disabled = true;
        resendBtn.textContent = 'Sending…';
        try {
          await authService.forgotPassword({ email: userEmail });
          showSuccess('A fresh 6-digit reset code has been sent to your email.');
        } catch (err) {
          showError(err.message || 'Unable to resend code. Please try again.');
        } finally {
          busy = false;
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend reset code';
        }
      });
    }

    if (changeEmailBtn) {
      changeEmailBtn.addEventListener('click', () => {
        currentStep = 1;
        render();
      });
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;

      const formData = new FormData(form);
      const code = formData.get('code')?.trim();
      const newPassword = formData.get('newPassword');
      const confirmPassword = formData.get('confirmPassword');

      if (!code || code.length !== 6) {
        showError('Please enter the complete 6-digit verification code.');
        return;
      }

      if (newPassword !== confirmPassword) {
        showError('Passwords do not match. Please re-enter your new password.');
        return;
      }

      if (newPassword.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
      }

      busy = true;
      submit.disabled = true;
      submit.textContent = 'Updating password…';
      feedback.hidden = true;

      try {
        await authService.resetPassword({
          email: userEmail,
          code,
          newPassword
        });
        currentStep = 3;
        render();
      } catch (err) {
        showError(err.message || 'Failed to reset password. Please check your code and try again.');
      } finally {
        busy = false;
        if (submit) {
          submit.disabled = false;
          submit.textContent = 'Set new password';
        }
      }
    });
  }

  render();
}
