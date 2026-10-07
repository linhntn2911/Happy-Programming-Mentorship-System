import { LoginForm, bindAuthInfo } from '../components/auth/LoginForm.js';
import { authService } from '../services/authService.js';

export const AuthShell = content => `
  <div class="auth-split-layout">
    <aside class="auth-image-side" aria-label="HappyProgramming online mentorship">
      <img
        src="/images/online-mentorship.jpg"
        alt="Online 1-on-1 coding mentorship session"
        class="auth-cover-image"
        loading="eager"
      />
      <div class="auth-image-overlay">
        <a class="auth-image-brand" href="#/" aria-label="HappyProgramming home">
          <span aria-hidden="true">{h}</span>
          <span>Happy<strong>Programming</strong></span>
        </a>
      </div>
    </aside>

    <div class="auth-content-side">
      <header class="auth-content-header">
        <a class="auth-home" href="#/" aria-label="HappyProgramming home">
          <span aria-hidden="true">{h}</span>
          <span>Happy<strong>Programming</strong></span>
        </a>
        <a href="#/" class="auth-back-btn" aria-label="Back to homepage">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
          <span class="auth-back-text">Back to homepage</span>
        </a>
      </header>
      <div class="auth-content-body">
        <main class="auth-panel">
          ${content}
        </main>
      </div>
    </div>
  </div>`;

export function mountLogin(root) {
  document.title = 'Log in | HappyProgramming';
  root.innerHTML = AuthShell(`<h1 class="font-display auth-title">Log in</h1>${LoginForm()}`);
  const form = root.querySelector('#login-form');
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const destination = params.get('return') === 'mentor' ? '#/apply/mentor'
    : params.get('return') === 'review' ? '#/staff/mentor-applications' : '#/';
  const feedback = form.querySelector('#login-feedback');
  const submit = form.querySelector('#login-submit');
  const google = form.querySelector('#google-login');
  let busy = false;
  let googleEnabled = false;
  const showError = message => { feedback.textContent = message; feedback.hidden = false; };
  const setBusy = value => {
    busy = value;
    form.setAttribute('aria-busy', String(value));
    submit.disabled = value;
    google.disabled = value || !googleEnabled;
    google.setAttribute('aria-disabled', String(google.disabled));
    submit.textContent = value ? 'Logging in…' : 'Log in';
    form.querySelectorAll('input').forEach(input => { input.disabled = value; });
  };
  if (location.hash.includes('error=google')) showError('Google login could not be completed. Use the Google account already linked to your account.');
  bindAuthInfo(root);
  authService.options().then(options => {
    if (!form.isConnected) return;
    googleEnabled = Boolean(options.googleEnabled);
    google.disabled = !googleEnabled || busy;
    google.setAttribute('aria-disabled', String(google.disabled));
    form.querySelector('#google-status').textContent = googleEnabled ? '' : 'Google login is not available yet. Please use email and password.';
  }).catch(() => {
    if (form.isConnected) form.querySelector('#google-status').textContent = 'Unable to check Google login. Please try email and password.';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const fields = new FormData(form);
    feedback.hidden = true;
    setBusy(true);
    try {
      const result = await authService.login({ email: fields.get('email').trim(), password: fields.get('password') });
      form.querySelector('#login-password').value = '';
      if (form.isConnected) {
        const userRole = result?.role || result?.role_code || (result?.roles && result.roles[0]);
        if (userRole === 'ADMIN') {
          location.hash = '#/admin';
        } else if (userRole === 'STAFF') {
          location.hash = '#/staff/mentor-applications';
        } else if (result?.mentorVerificationRequired) {
          location.hash = '#/apply/mentor';
        } else {
          location.hash = destination;
        }
      }
    } catch (error) {
      if (form.isConnected) showError(error instanceof TypeError ? 'Unable to connect. Please check your connection and try again.' : error.message);
    } finally { if (form.isConnected) setBusy(false); }
  });
  google.addEventListener('click', async () => {
    if (busy || !googleEnabled) return;
    setBusy(true);
    try {
      const result = await authService.google('MENTEE', destination === '#/apply/mentor' ? 'mentor' : null);
      if (form.isConnected && result.url === '/oauth2/authorization/google') location.assign(result.url);
    } catch (error) { if (form.isConnected) { showError(error.message); setBusy(false); } }
  });
}
