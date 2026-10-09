/**
 * Staff Dashboard Page - HappyProgramming Mentorship Platform
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { StaffLayout, staffIcon } from './StaffLayout.js';
import { StatCard, StatusBadge } from '../admin/AdminPrimitives.js';
import { escapeHtml as e } from '../../shared/html.js';

export function StaffDashboardPage(data = {}, user = null) {
  const staffName = user?.name || user?.email || 'Staff';
  const firstName = staffName.split(/\s+/)[0] || 'Staff';

  const stats = {
    pendingApplicationsCount: data.pendingApplicationsCount ?? 0,
    activeMentorsCount: data.activeMentorsCount ?? 0,
    activeMenteesCount: data.activeMenteesCount ?? 0,
    pendingRequestsCount: data.pendingRequestsCount ?? 0,
    recentActivities: data.recentActivities || []
  };

  const volumeTracks = [
    { label: 'Java & Spring Boot', count: 420, percentage: 85 },
    { label: 'React & Next.js', count: 310, percentage: 65 },
    { label: 'Python & AI / Data', count: 215, percentage: 45 },
    { label: 'DevOps & Cloud Infrastructure', count: 160, percentage: 35 },
  ];

  const content = `
    <!-- Page Heading -->
    <div class="admin-page-heading">
      <div>
        <p class="eyebrow mb-3">HAPPYPROGRAMMING STAFF</p>
        <h1>Welcome back, ${e(firstName)}.</h1>
        <p>A little oversight, a thriving community. Here is your operational queue at a glance.</p>
      </div>
      <div>
        <a class="btn btn-primary" href="#/staff/mentor-applications">
          Review applications
          ${staffIcon('applications')}
        </a>
      </div>
    </div>

    <!-- 4 Stats Cards Grid -->
    <div class="admin-stats">
      ${StatCard({
        label: 'Pending applications',
        value: stats.pendingApplicationsCount,
        note: 'CV & Credentials · SLA 48h',
        icon: staffIcon('applications')
      })}
      ${StatCard({
        label: 'Active mentors',
        value: stats.activeMentorsCount,
        note: 'Approved specialists',
        icon: staffIcon('mentors')
      })}
      ${StatCard({
        label: 'Active mentees',
        value: stats.activeMenteesCount,
        note: 'Registered community members',
        icon: staffIcon('mentees')
      })}
      ${StatCard({
        label: 'Pending requests',
        value: stats.pendingRequestsCount,
        note: 'Mentorship connection requests',
        icon: staffIcon('dashboard')
      })}
    </div>

    <!-- 2-Column Operational Grid -->
    <div class="admin-grid">
      <!-- Category Volume Panel -->
      <section class="admin-panel">
        <div class="admin-panel-heading">
          <div>
            <h2>Mentorship category demand</h2>
            <p>Weekly connection requests across technical categories</p>
          </div>
          <span class="status-badge status-neutral">Live stream</span>
        </div>
        <div class="admin-panel-body">
          <div class="space-y-4">
            ${volumeTracks.map(track => `
              <div>
                <div class="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span class="text-ink">${e(track.label)}</span>
                  <span class="text-muted font-normal">${track.count} requests</span>
                </div>
                <div class="w-full bg-[#f1e8ff] h-2.5 rounded-full overflow-hidden">
                  <div class="bg-brand h-full rounded-full transition-all duration-500" style="width: ${track.percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Recent Staff Activity Panel -->
      <section class="admin-panel">
        <div class="admin-panel-heading">
          <div>
            <h2>Recent staff activity</h2>
            <p>Operational audit log of recent updates and decisions</p>
          </div>
          <a class="text-brand text-[11px] font-semibold hover:underline" href="#/staff/mentor-applications">View all</a>
        </div>
        <div class="admin-panel-body admin-activity">
          ${stats.recentActivities.length > 0 ? stats.recentActivities.map(act => `
            <div class="admin-activity-item">
              <span class="admin-avatar">${staffIcon('applications')}</span>
              <div class="grow">
                <div class="flex items-center justify-between gap-2">
                  <p class="font-semibold text-ink">${e(act.title)}</p>
                  ${StatusBadge(act.status)}
                </div>
                <p class="text-muted text-xs mt-0.5">${e(act.description)}</p>
                <small class="text-muted text-[10px] mt-1 block">${e(act.timeAgo || 'Recently')}</small>
              </div>
            </div>
          `).join('') : `
            <div class="py-8 text-center text-xs text-muted">
              No recent activities recorded.
            </div>
          `}
        </div>
      </section>
    </div>

    <!-- Operational Shortcuts Panel -->
    <section class="admin-panel">
      <div class="admin-panel-heading">
        <div>
          <h2>Operational directory quick links</h2>
          <p>Direct navigation to primary management registries</p>
        </div>
      </div>
      <div class="admin-panel-body">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="#/staff/mentor-applications" class="p-4 rounded-xl border border-line hover:border-brand/40 hover:bg-[#fbf9ff] transition-all block group">
            <div class="w-8 h-8 rounded-lg bg-lilac text-brand grid place-items-center mb-3">
              ${staffIcon('applications')}
            </div>
            <p class="font-semibold text-xs text-ink group-hover:text-brand">Review Applications</p>
            <p class="text-muted text-[11px] mt-1">Review applicant qualifications, verify PDF CV documents, and issue approval decisions.</p>
          </a>
          <a href="#/staff/mentors" class="p-4 rounded-xl border border-line hover:border-brand/40 hover:bg-[#fbf9ff] transition-all block group">
            <div class="w-8 h-8 rounded-lg bg-lilac text-brand grid place-items-center mb-3">
              ${staffIcon('mentors')}
            </div>
            <p class="font-semibold text-xs text-ink group-hover:text-brand">Manager Mentors</p>
            <p class="text-muted text-[11px] mt-1">Inspect verified mentors, technical skills, hourly/monthly pricing, and profile state.</p>
          </a>
          <a href="#/staff/mentees" class="p-4 rounded-xl border border-line hover:border-brand/40 hover:bg-[#fbf9ff] transition-all block group">
            <div class="w-8 h-8 rounded-lg bg-lilac text-brand grid place-items-center mb-3">
              ${staffIcon('mentees')}
            </div>
            <p class="font-semibold text-xs text-ink group-hover:text-brand">Manager Mentees</p>
            <p class="text-muted text-[11px] mt-1">View registered mentee accounts, active requests, and account verification status.</p>
          </a>
        </div>
      </div>
    </section>
  `;

  return StaffLayout('dashboard', content, {
    name: staffName
  });
}
