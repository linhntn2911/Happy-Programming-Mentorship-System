import { authService } from './authService.js';
import { ChangePasswordForm, bindChangePasswordForm } from './ChangePasswordForm.js';
import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { renderUserDropdown, bindUserDropdown, getInitials, renderNotificationBell } from '../../shared/Header.js';

export async function mountChangePassword(root) {
  document.title = 'Change Password | HappyProgramming';

  root.innerHTML = `
    <main class="min-h-screen bg-cream">
      <div class="container py-16 text-center">
        <p role="status" id="change-pwd-loading" class="text-sm text-muted">Checking authentication…</p>
      </div>
    </main>
  `;

  let user;
  try {
    user = await authService.me();
  } catch (error) {
    if (error.status === 401) {
      window.location.hash = '#/login?return=change-password';
      return;
    }
    const loadingEl = root.querySelector('#change-pwd-loading');
    if (loadingEl) {
      loadingEl.textContent = error.message || 'Unable to load account information.';
      loadingEl.insertAdjacentHTML('afterend', '<p class="mt-4"><a href="#/login" class="btn btn-primary">Go to Log in</a></p>');
    }
    return;
  }

  let isSuccess = false;

  function render() {
    const displayName = user.name || user.email || 'Your account';
    const initials = getInitials(displayName);

    root.innerHTML = `
      <header class="directory-header">
        <div class="container flex h-[76px] items-center justify-between gap-6">
          <a href="#/" class="flex items-center gap-2.5" aria-label="HappyProgramming home">
            <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span>
            <span class="font-semibold text-ink">Happy<span class="text-brand">Programming</span></span>
          </a>
          <nav class="flex items-center gap-6" aria-label="Main navigation">
            ${BrowseAllMentorsLink()}
            ${renderNotificationBell()}
            ${renderUserDropdown({ currentUser: user, displayName, initials })}
          </nav>
        </div>
      </header>
      <main class="min-h-screen bg-cream py-12">
        <div class="container max-w-xl">
          <p class="eyebrow">ACCOUNT SECURITY</p>
          <h1 class="mt-3 font-display text-3xl sm:text-4xl text-ink">Change password</h1>
          <p class="mt-2 text-sm text-muted">Update your password to keep your account safe and secure.</p>
          <div class="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
            ${ChangePasswordForm({ success: isSuccess })}
          </div>
        </div>
      </main>
    `;

    bindUserDropdown(root);

    if (!isSuccess) {
      bindChangePasswordForm(root);
      bindFormSubmission();
    }
  }

  function bindFormSubmission() {
    const form = root.querySelector('#change-password-form');
    if (!form) return;

    const feedback = form.querySelector('#change-password-feedback');
    const submitBtn = form.querySelector('#change-password-submit');

    const showError = msg => {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.className = 'auth-feedback text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs';
      feedback.hidden = false;
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const currentPassword = form.elements.currentPassword?.value || '';
      const newPassword = form.elements.newPassword?.value || '';
      const confirmPassword = form.elements.confirmPassword?.value || '';

      if (!currentPassword) {
        showError('Please enter your current password.');
        return;
      }
      if (!newPassword) {
        showError('Please enter your new password.');
        return;
      }
      if (newPassword.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        showError('Password must include at least one lowercase character.');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        showError('Password must include at least one uppercase character.');
        return;
      }
      if (newPassword === currentPassword) {
        showError('New password cannot be the same as current password.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showError('New password and confirmation do not match.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating password…';
      feedback.hidden = true;

      try {
        await authService.changePassword({ currentPassword, newPassword });
        isSuccess = true;
        render();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update password';
        showError(err.message || 'Unable to change password. Please check your current password.');
      }
    });
  }

  render();
}
