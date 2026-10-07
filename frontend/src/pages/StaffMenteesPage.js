/**
 * Staff Manager Mentees Page - HappyProgramming
 * UC36, UC46, Section 5.3 in SRS
 */

export function StaffMenteesPage(mentees = []) {
  const menteeRowsHtml = mentees.length > 0 ? mentees.map((m, index) => {
    let statusBadge = '<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">ACTIVE</span>';
    if (m.status === 'LOCKED') {
      statusBadge = '<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800">LOCKED</span>';
    } else if (m.status === 'INACTIVE') {
      statusBadge = '<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">INACTIVE</span>';
    }

    return `
      <tr class="hover:bg-[#fbf9ff] transition-colors border-b border-[#e8e0f1]">
        <td class="px-4 py-3.5 text-xs font-bold text-slate-400">${index + 1}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-[#f1e8ff] text-[#8b46e8] flex items-center justify-center font-bold text-sm">
              ${m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div>
              <div class="font-bold text-sm text-[#25143f]">${m.name}</div>
              <div class="text-xs text-slate-500">${m.emailVerified ? 'Email Verified ✓' : 'Unverified Email'}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3.5 text-xs text-slate-600 font-medium">${m.email}</td>
        <td class="px-4 py-3.5 text-xs text-slate-500 font-semibold">${m.registeredDate}</td>
        <td class="px-4 py-3.5">
          <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">${m.requestsCount} requests</span>
        </td>
        <td class="px-4 py-3.5">${statusBadge}</td>
        <td class="px-4 py-3.5">
          <button class="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#f1e8ff] text-[#8b46e8] hover:bg-[#8b46e8] hover:text-white transition-colors">
            View Profile
          </button>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="7" class="py-12 text-center text-sm text-slate-500">No mentees found.</td>
    </tr>
  `;

  return `
    <div class="min-h-screen bg-[#fbf9ff] text-[#25143f] font-sans antialiased">
      <!-- Staff Header -->
      <header class="bg-white border-b border-[#e8e0f1] sticky top-0 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center gap-3">
              <a href="#" class="flex items-center gap-2 group">
                <div class="w-9 h-9 rounded-xl bg-[#8b46e8] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#7431d0] transition-colors">HP</div>
                <span class="font-extrabold text-xl tracking-tight text-[#25143f]">Happy<span class="text-[#8b46e8]">Programming</span></span>
              </a>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f1e8ff] text-[#8b46e8] border border-[#8b46e8]/20">Staff Portal</span>
            </div>

            <div class="flex items-center gap-3">
              <a href="#/staff/dashboard" class="text-xs font-bold text-slate-600 hover:text-[#8b46e8]">Back to Dashboard &rarr;</a>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Container -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Sidebar -->
          <aside class="lg:col-span-3">
            <nav class="bg-white rounded-2xl p-4 border border-[#e8e0f1] shadow-xs space-y-1">
              <a href="#/staff/dashboard" class="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Staff Dashboard
              </a>
              <a href="#/staff/mentors" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  Manager Mentors
                </div>
              </a>
              <a href="#/staff/mentees" class="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl bg-[#f1e8ff] text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  Manager Mentees
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-[#8b46e8]">${mentees.length}</span>
              </a>
              <a href="#/staff/skills" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 11h.01M7 15h.01M13 7h7M13 11h7M13 15h7M3 19h18a2 2 0 002-2V5a2 2 0 00-2-2H3a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Skills List
                </div>
              </a>
              <a href="#/staff/mentor-applications" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Mentor Applications
                </div>
              </a>
            </nav>
          </aside>

          <!-- Main Content -->
          <main class="lg:col-span-9 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-extrabold text-[#25143f] tracking-tight">Manager Mentees</h1>
                <p class="text-sm text-slate-500 mt-1">View registered mentee accounts, connection requests, and user status (BR-28)</p>
              </div>
            </div>

            <!-- Search & Filter Card -->
            <div class="bg-white rounded-2xl p-4 border border-[#e8e0f1] shadow-xs flex flex-wrap items-center gap-3">
              <input type="text" placeholder="Search by name or email..." class="flex-1 min-w-[200px] px-3.5 py-2 text-sm bg-[#fbf9ff] border border-[#e8e0f1] rounded-xl focus:outline-none focus:border-[#8b46e8]" />
              <select class="px-3.5 py-2 text-sm bg-[#fbf9ff] border border-[#e8e0f1] rounded-xl focus:outline-none focus:border-[#8b46e8]">
                <option value="ALL">Status: All</option>
                <option value="ACTIVE" selected>Status: Active</option>
                <option value="INACTIVE">Status: Inactive</option>
                <option value="LOCKED">Status: Locked</option>
              </select>
              <select class="px-3.5 py-2 text-sm bg-[#fbf9ff] border border-[#e8e0f1] rounded-xl focus:outline-none focus:border-[#8b46e8]">
                <option value="NEWEST" selected>Sort: Newest</option>
                <option value="OLDEST">Sort: Oldest</option>
                <option value="MOST_REQUESTS">Sort: Most Requests</option>
              </select>
            </div>

            <!-- Mentees Table Card -->
            <div class="bg-white rounded-2xl border border-[#e8e0f1] shadow-xs overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-[#fbf9ff] border-b border-[#e8e0f1] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th class="px-4 py-3">No</th>
                      <th class="px-4 py-3">Mentee Name</th>
                      <th class="px-4 py-3">Email</th>
                      <th class="px-4 py-3">Registered On</th>
                      <th class="px-4 py-3">Requests</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${menteeRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  `;
}
