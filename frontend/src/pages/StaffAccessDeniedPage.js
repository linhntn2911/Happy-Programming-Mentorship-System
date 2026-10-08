/**
 * Staff Access Denied Page - HappyProgramming
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { escapeHtml as e } from '../utils/html.js';

export function StaffAccessDeniedPage(currentUser = null) {
  const isUserLoggedIn = !!currentUser;
  const userRole = currentUser ? (currentUser.role || currentUser.role_code || 'GUEST') : 'GUEST';
  const userEmail = currentUser ? currentUser.email : '';

  return `
    <div class="min-h-screen bg-[#fbf9ff] text-ink font-body flex flex-col justify-between">
      <!-- Topbar Header -->
      <header class="bg-white border-b border-line px-8 py-5 flex items-center justify-between">
        <a href="#/" class="admin-logo" aria-label="HappyProgramming home">
          <span class="admin-logo-mark">{h}</span>
          <span>Happy<span class="text-brand">Programming</span></span>
        </a>
        <a href="#/" class="text-xs font-semibold text-muted hover:text-brand transition-colors">
          &larr; Back to website
        </a>
      </header>

      <!-- Access Denied Card -->
      <main class="flex-1 flex items-center justify-center p-6">
        <div class="max-w-md w-full bg-white rounded-2xl p-8 border border-line shadow-sm text-center space-y-6">
          <div class="w-14 h-14 rounded-2xl bg-lilac text-brand grid place-items-center mx-auto">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <div>
            <p class="eyebrow mb-2">STAFF WORKSPACE RESTRICTION</p>
            <h1 class="font-display text-2xl text-ink">Access Restricted</h1>
            <p class="text-xs text-muted mt-1.5">403 Forbidden · Role authorization validation error</p>
          </div>

          <div class="bg-[#fbf9ff] border border-line rounded-xl p-4 text-left text-xs leading-relaxed text-muted space-y-2">
            ${isUserLoggedIn ? `
              <p>You are signed in as <strong>${e(userEmail)}</strong> with role <span class="badge">${e(userRole)}</span>.</p>
              <p>Only accounts with authorized <strong>STAFF</strong> or <strong>ADMIN</strong> roles may access back-office management views.</p>
            ` : `
              <p>You must authenticate with an authorized <strong>Staff account</strong> to access the Operational Workspace.</p>
            `}
          </div>

          <!-- Actions -->
          <div class="space-y-3 pt-1">
            <button id="open-staff-login-btn" class="btn btn-primary w-full" type="button">
              Log in as Staff
            </button>
            <a href="#/" class="btn btn-outline w-full block text-center">
              Return to homepage
            </a>
          </div>
        </div>
      </main>

      <footer class="py-4 text-center text-[11px] text-muted border-t border-line bg-white">
        HappyProgramming Back-office Platform · Protected Resource
      </footer>
    </div>
  `;
}
