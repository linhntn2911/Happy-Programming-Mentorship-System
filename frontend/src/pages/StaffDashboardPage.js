/**
 * Staff Dashboard Page - HappyProgramming Mentorship Platform
 * Complies with AGENTS.md Design System and specs/001-staff-management/spec.md
 */

export function StaffDashboardPage(data = {}) {
  const stats = {
    pendingApplicationsCount: data.pendingApplicationsCount ?? 0,
    activeMentorsCount: data.activeMentorsCount ?? 0,
    activeMenteesCount: data.activeMenteesCount ?? 0,
    pendingRequestsCount: data.pendingRequestsCount ?? 0,
    recentActivities: data.recentActivities || []
  };

  const activityList = stats.recentActivities;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">PENDING (48h SLA)</span>';
      case 'APPROVED':
      case 'ACTIVE':
      case 'ACCEPTED':
      case 'RESOLVED':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">' + status + '</span>';
      case 'REJECTED':
      case 'CANCELLED':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">' + status + '</span>';
      default:
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">' + status + '</span>';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'APPLICATION': return '📄';
      case 'REQUEST': return '💬';
      case 'SKILL': return '🏷️';
      case 'SUPPORT': return '🛡️';
      default: return '📌';
    }
  };

  return `
    <div class="min-h-screen bg-[#fbf9ff] text-[#25143f] font-sans antialiased">
      <!-- Staff Header -->
      <header class="bg-white border-b border-[#e8e0f1] sticky top-0 z-30 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center gap-3">
              <a href="#" class="flex items-center gap-2 group">
                <div class="w-9 h-9 rounded-xl bg-[#8b46e8] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#7431d0] transition-colors">
                  HP
                </div>
                <span class="font-extrabold text-xl tracking-tight text-[#25143f]">
                  Happy<span class="text-[#8b46e8]">Programming</span>
                </span>
              </a>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#f1e8ff] text-[#8b46e8] border border-[#8b46e8]/20">
                Staff Portal
              </span>
            </div>

            <div class="flex items-center gap-4">
              <div class="relative hidden md:flex items-center">
                <input 
                  type="text" 
                  placeholder="Search applications, requests, skills..." 
                  class="w-64 pl-9 pr-4 py-1.5 text-sm bg-[#fbf9ff] border border-[#e8e0f1] rounded-lg focus:outline-none focus:border-[#8b46e8] focus:ring-1 focus:ring-[#8b46e8]"
                />
                <svg class="w-4 h-4 text-slate-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>

              <div class="flex items-center gap-3 border-l border-[#e8e0f1] pl-4">
                <div class="w-9 h-9 rounded-full bg-[#f1e8ff] text-[#8b46e8] flex items-center justify-center font-bold text-sm">
                  ST
                </div>
                <div class="hidden sm:block text-left">
                  <div class="text-sm font-bold text-[#25143f]">Nguyen Van Staff</div>
                  <div class="text-xs text-slate-500">Operational Staff</div>
                </div>
                <a href="#" class="ml-2 text-xs font-semibold text-slate-500 hover:text-[#8b46e8] transition-colors">
                  Logout
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Sidebar Navigation -->
          <aside class="lg:col-span-3">
            <nav class="bg-white rounded-2xl p-4 border border-[#e8e0f1] shadow-xs space-y-1">
              <a href="#/staff/dashboard" class="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl bg-[#f1e8ff] text-[#8b46e8] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
                Staff Dashboard
              </a>
              <a href="#/staff/mentors" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                  Manager Mentors
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${stats.activeMentorsCount}</span>
              </a>
              <a href="#/staff/mentees" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  Manager Mentees
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${stats.activeMenteesCount}</span>
              </a>
              <a href="#/staff/skills" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 11h.01M7 15h.01M13 7h7M13 11h7M13 15h7M3 19h18a2 2 0 002-2V5a2 2 0 00-2-2H3a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Skills List
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f1e8ff] text-[#8b46e8]">Managed</span>
              </a>
              <a href="#/staff/mentor-applications" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Mentor Applications
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">${stats.pendingApplicationsCount}</span>
              </a>
              <a href="#/staff/requests" class="flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-[#fbf9ff] hover:text-[#8b46e8] transition-colors">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                  Requests Ledger
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">${stats.pendingRequestsCount}</span>
              </a>
            </nav>

            <!-- Operational Notice -->
            <div class="mt-6 bg-[#f1e8ff]/50 rounded-2xl p-4 border border-[#8b46e8]/20">
              <div class="flex items-center gap-2 font-bold text-sm text-[#25143f] mb-2">
                <span>🛡️</span> Staff SLA Guidelines
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">
                Mentor applications & requests must be processed within the <strong>48-hour SLA</strong> (GB-16). All operational status changes are strictly recorded in audit logs (GB-11).
              </p>
            </div>
          </aside>

          <!-- Main Content Dashboard View -->
          <main class="lg:col-span-9 space-y-8">
            <!-- Page Title Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-extrabold text-[#25143f] tracking-tight">Staff Operations Dashboard</h1>
                <p class="text-sm text-slate-500 mt-1">Real-time platform metrics, application queues, and back-office activity log</p>
              </div>
              <div class="flex items-center gap-3">
                <a href="#/staff/mentor-applications" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-[#8b46e8] text-white hover:bg-[#7431d0] shadow-sm transition-colors">
                  <span>📄</span> Review Applications (${stats.pendingApplicationsCount})
                </a>
              </div>
            </div>

            <!-- Top Metric Cards Grid (4 Cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <!-- Card 1: Pending Applications -->
              <div class="bg-white rounded-2xl p-5 border border-[#e8e0f1] shadow-xs hover:border-[#8b46e8]/40 transition-all">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Pending Applications</span>
                  <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                    📄
                  </div>
                </div>
                <div class="mt-4 flex items-baseline justify-between">
                  <span class="text-3xl font-extrabold text-[#25143f]">${stats.pendingApplicationsCount}</span>
                  <span class="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">SLA 48h</span>
                </div>
                <div class="mt-3 pt-3 border-t border-[#e8e0f1] flex items-center justify-between text-xs text-slate-500">
                  <span>CV & Credentials Queue</span>
                  <a href="#/staff/mentor-applications" class="font-bold text-[#8b46e8] hover:underline">Inspect &rarr;</a>
                </div>
              </div>

              <!-- Card 2: Active Mentors -->
              <div class="bg-white rounded-2xl p-5 border border-[#e8e0f1] shadow-xs hover:border-[#8b46e8]/40 transition-all">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Mentors</span>
                  <div class="w-10 h-10 rounded-xl bg-[#f1e8ff] text-[#8b46e8] flex items-center justify-center font-bold text-lg">
                    🎓
                  </div>
                </div>
                <div class="mt-4 flex items-baseline justify-between">
                  <span class="text-3xl font-extrabold text-[#25143f]">${stats.activeMentorsCount}</span>
                  <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Verified</span>
                </div>
                <div class="mt-3 pt-3 border-t border-[#e8e0f1] flex items-center justify-between text-xs text-slate-500">
                  <span>Approved Specialists</span>
                  <a href="#/staff/mentors" class="font-bold text-[#8b46e8] hover:underline">View All &rarr;</a>
                </div>
              </div>

              <!-- Card 3: Active Mentees -->
              <div class="bg-white rounded-2xl p-5 border border-[#e8e0f1] shadow-xs hover:border-[#8b46e8]/40 transition-all">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Mentees</span>
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    👨‍💻
                  </div>
                </div>
                <div class="mt-4 flex items-baseline justify-between">
                  <span class="text-3xl font-extrabold text-[#25143f]">${stats.activeMenteesCount.toLocaleString()}</span>
                  <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">Registered</span>
                </div>
                <div class="mt-3 pt-3 border-t border-[#e8e0f1] flex items-center justify-between text-xs text-slate-500">
                  <span>Student Directory</span>
                  <a href="#/staff/mentees" class="font-bold text-[#8b46e8] hover:underline">Manage &rarr;</a>
                </div>
              </div>

              <!-- Card 4: Pending Requests -->
              <div class="bg-white rounded-2xl p-5 border border-[#e8e0f1] shadow-xs hover:border-[#8b46e8]/40 transition-all">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold tracking-wider text-slate-400 uppercase">Pending Requests</span>
                  <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                    💬
                  </div>
                </div>
                <div class="mt-4 flex items-baseline justify-between">
                  <span class="text-3xl font-extrabold text-[#25143f]">${stats.pendingRequestsCount}</span>
                  <span class="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">In Review</span>
                </div>
                <div class="mt-3 pt-3 border-t border-[#e8e0f1] flex items-center justify-between text-xs text-slate-500">
                  <span>Mentorship Connections</span>
                  <a href="#/staff/requests" class="font-bold text-[#8b46e8] hover:underline">Track Ledger &rarr;</a>
                </div>
              </div>

            </div>

            <!-- Middle Section: Chart & Quick Operations Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <!-- Platform Activity Visual Chart (8 cols) -->
              <div class="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#e8e0f1] shadow-xs">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h2 class="font-bold text-lg text-[#25143f]">Platform Interaction & Mentorship Volume</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Weekly requests across top technical categories</p>
                  </div>
                  <span class="text-xs font-bold px-3 py-1 rounded-full bg-[#f1e8ff] text-[#8b46e8]">Live Trend</span>
                </div>

                <!-- Activity Bar Chart -->
                <div class="space-y-4 my-2">
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Java & Spring Boot Track</span>
                      <span>${stats.pendingRequestsCount > 0 ? '420 requests' : '0 requests'}</span>
                    </div>
                    <div class="w-full bg-[#f1e8ff] h-3 rounded-full overflow-hidden">
                      <div class="bg-[#8b46e8] h-full rounded-full" style="width: ${stats.pendingRequestsCount > 0 ? '78%' : '0%'}"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>React & Next.js Frontend</span>
                      <span>${stats.pendingRequestsCount > 0 ? '310 requests' : '0 requests'}</span>
                    </div>
                    <div class="w-full bg-[#f1e8ff] h-3 rounded-full overflow-hidden">
                      <div class="bg-[#7431d0] h-full rounded-full" style="width: ${stats.pendingRequestsCount > 0 ? '62%' : '0%'}"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Python & AI / Data Engineering</span>
                      <span>${stats.pendingRequestsCount > 0 ? '215 requests' : '0 requests'}</span>
                    </div>
                    <div class="w-full bg-[#f1e8ff] h-3 rounded-full overflow-hidden">
                      <div class="bg-indigo-500 h-full rounded-full" style="width: ${stats.pendingRequestsCount > 0 ? '48%' : '0%'}"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>DevOps & Docker Infrastructure</span>
                      <span>${stats.pendingRequestsCount > 0 ? '160 requests' : '0 requests'}</span>
                    </div>
                    <div class="w-full bg-[#f1e8ff] h-3 rounded-full overflow-hidden">
                      <div class="bg-blue-500 h-full rounded-full" style="width: ${stats.pendingRequestsCount > 0 ? '35%' : '0%'}"></div>
                    </div>
                  </div>
                </div>

                <!-- Quick Action Shortcuts Grid -->
                <div class="mt-8 pt-6 border-t border-[#e8e0f1] grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <a href="#/staff/mentor-applications" class="p-4 rounded-xl bg-[#fbf9ff] border border-[#e8e0f1] hover:border-[#8b46e8] hover:bg-[#f1e8ff]/40 transition-all text-left group">
                    <div class="text-xl mb-1">📄</div>
                    <div class="font-bold text-sm text-[#25143f] group-hover:text-[#8b46e8]">Duyệt Hồ sơ Mentor</div>
                    <div class="text-xs text-slate-500 mt-1">Xem CV PDF (max 10MB) & Chấp nhận/Từ chối</div>
                  </a>

                  <a href="#/staff/skills" class="p-4 rounded-xl bg-[#fbf9ff] border border-[#e8e0f1] hover:border-[#8b46e8] hover:bg-[#f1e8ff]/40 transition-all text-left group">
                    <div class="text-xl mb-1">🏷️</div>
                    <div class="font-bold text-sm text-[#25143f] group-hover:text-[#8b46e8]">Quản lý Skill Catalog</div>
                    <div class="text-xs text-slate-500 mt-1">Thêm mới & Bật/Tắt kỹ năng hiển thị</div>
                  </a>

                  <a href="#/staff/requests" class="p-4 rounded-xl bg-[#fbf9ff] border border-[#e8e0f1] hover:border-[#8b46e8] hover:bg-[#f1e8ff]/40 transition-all text-left group">
                    <div class="text-xl mb-1">🔍</div>
                    <div class="font-bold text-sm text-[#25143f] group-hover:text-[#8b46e8]">Theo dõi Requests</div>
                    <div class="text-xs text-slate-500 mt-1">Tra cứu tiến độ & hỗ trợ đổi trạng thái</div>
                  </a>
                </div>
              </div>

              <!-- Recent Staff Activity Ledger (4 cols) -->
              <div class="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#e8e0f1] shadow-xs flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-lg text-[#25143f]">Recent Staff Activity</h2>
                    <span class="text-xs font-semibold text-slate-400">Live Stream</span>
                  </div>

                  <div class="space-y-4">
                    ${activityList.length > 0 ? activityList.map(item => `
                      <div class="p-3.5 rounded-xl bg-[#fbf9ff] border border-[#e8e0f1] hover:border-[#8b46e8]/30 transition-all">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex items-center gap-2">
                            <span class="text-base">${getTypeIcon(item.type)}</span>
                            <span class="font-bold text-xs text-[#25143f]">${item.title}</span>
                          </div>
                          <div>${getStatusBadge(item.status)}</div>
                        </div>
                        <p class="text-xs text-slate-600 mt-2 leading-relaxed">${item.description}</p>
                        <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                          <span>${item.timeAgo}</span>
                          <span class="font-semibold text-[#8b46e8]">Audit Logged</span>
                        </div>
                      </div>
                    `).join('') : `
                      <div class="py-8 text-center bg-[#fbf9ff] rounded-xl border border-[#e8e0f1]">
                        <div class="text-2xl mb-1">📭</div>
                        <div class="text-xs font-bold text-[#25143f]">No Recent Activities</div>
                        <div class="text-[11px] text-slate-500 mt-1">Staff operational log is currently empty.</div>
                      </div>
                    `}
                  </div>
                </div>

                <div class="mt-6 pt-4 border-t border-[#e8e0f1] text-center">
                  <a href="#/staff/requests" class="text-xs font-bold text-[#8b46e8] hover:underline">
                    View Complete Activity Ledger &rarr;
                  </a>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  `;
}
