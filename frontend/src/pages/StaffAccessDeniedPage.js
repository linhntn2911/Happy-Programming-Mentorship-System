/**
 * Staff Access Denied Page - HappyProgramming
 * Rendered when an unauthenticated user or non-staff user attempts to access /staff/*
 */

export function StaffAccessDeniedPage(currentUser = null) {
  const isUserLoggedIn = !!currentUser;
  const userRole = currentUser ? currentUser.role_code : 'GUEST';
  const userEmail = currentUser ? currentUser.email : '';

  return `
    <div class="min-h-screen bg-[#fbf9ff] text-[#25143f] font-sans antialiased flex flex-col justify-between">
      <!-- Header -->
      <header class="bg-white border-b border-[#e8e0f1] sticky top-0 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <a href="#" class="flex items-center gap-2 group">
              <div class="w-9 h-9 rounded-xl bg-[#8b46e8] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#7431d0] transition-colors">HP</div>
              <span class="font-extrabold text-xl tracking-tight text-[#25143f]">Happy<span class="text-[#8b46e8]">Programming</span></span>
            </a>
            <div class="flex items-center gap-3">
              <a href="#" class="text-xs font-bold text-slate-600 hover:text-[#8b46e8]">&larr; Return to Home</a>
            </div>
          </div>
        </div>
      </header>

      <!-- Access Denied Card -->
      <main class="flex-1 flex items-center justify-center px-4 py-12">
        <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e8e0f1] shadow-xl text-center space-y-6">
          <div class="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🔒
          </div>

          <div>
            <h1 class="text-2xl font-extrabold text-[#25143f] tracking-tight">Staff Portal Access Restricted</h1>
            <p class="text-xs font-bold text-rose-600 uppercase tracking-wider mt-1">403 Forbidden / Role Validation Error</p>
          </div>

          <div class="bg-[#fbf9ff] border border-[#e8e0f1] rounded-2xl p-4 text-left text-xs leading-relaxed text-slate-600 space-y-2">
            ${isUserLoggedIn ? `
              <p>You are currently signed in as <strong>${userEmail}</strong> with role <span class="px-2 py-0.5 font-bold rounded-md bg-purple-100 text-purple-800">${userRole}</span>.</p>
              <p class="text-slate-500">Only accounts with the <strong>STAFF</strong> role are authorized to access back-office management views (GB-14, BR-29).</p>
            ` : `
              <p>You must sign in with an authorized <strong>Staff account</strong> (e.g. <code>staff@happyprogramming.vn</code>) to access the Staff Operations Dashboard.</p>
            `}
          </div>

          <!-- Quick Action Buttons -->
          <div class="space-y-3 pt-2">
            <button id="open-staff-login-btn" class="w-full py-3 px-4 rounded-xl bg-[#8b46e8] text-white font-bold text-sm hover:bg-[#7431d0] shadow-md transition-all flex items-center justify-center gap-2">
              <span>🔑</span> Log in as Staff (staff@happyprogramming.vn)
            </button>
            <a href="#" class="block w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors">
              Return to Homepage
            </a>
          </div>

          <!-- Demo Helper Box -->
          <div class="pt-4 border-t border-[#e8e0f1] text-[11px] text-slate-400">
            <span class="font-bold text-slate-500">Demo Credentials:</span> Email: <code>staff@happyprogramming.vn</code> | Pass: <code>Staff@123</code>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-[#e8e0f1] py-4 text-center text-xs text-slate-400">
        HappyProgramming Mentorship System &copy; 2026. All rights reserved.
      </footer>
    </div>
  `;
}
