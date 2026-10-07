import { AuthShell } from './LoginPage.js';
import { authService } from '../services/authService.js';

export async function mountAccount(root) {
  document.title = 'Your account | HappyProgramming';
  root.innerHTML = AuthShell('<h1 class="font-display auth-title">Your account</h1><p role="status" id="account-status">Loading your account…</p>');
  const status = root.querySelector('#account-status');
  try {
    const user = await authService.me();
    if (!status.isConnected) return;
    status.innerHTML = '<span id="account-name"></span><br><span id="account-email" class="text-muted"></span><br><span id="account-role" class="text-brand"></span>';
    status.querySelector('#account-name').textContent = user.name;
    status.querySelector('#account-email').textContent = user.email;
    status.querySelector('#account-role').textContent = user.role === 'MENTOR' ? 'Mentor account' : 'Mentee account';
    status.insertAdjacentHTML('afterend', '<div class="mt-8 flex flex-wrap gap-3"><a class="btn btn-primary" href="#/mentors">Browse mentors</a><button class="btn btn-outline" id="logout-button">Log out</button></div><p id="logout-error" role="alert" class="auth-feedback" hidden></p>');
    root.querySelector('#logout-button').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try { await authService.logout(); if (button.isConnected) location.hash = '#/login'; }
      catch (error) {
        if (!button.isConnected) return;
        const message = root.querySelector('#logout-error');
        message.textContent = error.message; message.hidden = false; button.disabled = false;
      }
    });
  } catch (error) {
    if (!status.isConnected) return;
    if (error.status === 401) location.hash = '#/login';
    else {
      status.textContent = 'Unable to load your account. Please try again.';
      status.insertAdjacentHTML('afterend', '<button class="btn btn-primary mt-6" id="retry-account">Try again</button>');
      root.querySelector('#retry-account').addEventListener('click', () => mountAccount(root));
    }
  }
}
