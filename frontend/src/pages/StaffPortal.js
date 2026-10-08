/**
 * Staff Portal Controller / Mount Handlers - HappyProgramming
 * Wires StaffDashboardPage, StaffApplicationsPage, StaffMentorsPage, and StaffMenteesPage.
 * Complies with AGENTS.md, specs/001-staff-management/spec.md, and RBAC security rules.
 */
import { StaffDashboardPage } from './StaffDashboardPage.js';
import { StaffApplicationsPage } from './StaffApplicationsPage.js';
import { StaffMentorsPage } from './StaffMentorsPage.js';
import { StaffMenteesPage } from './StaffMenteesPage.js';
import { StaffAccessDeniedPage } from './StaffAccessDeniedPage.js';
import { staffService } from '../services/staffService.js';
import { authService } from '../services/authService.js';

async function checkStaffAccess(root) {
  let user = authService.getCurrentUser();
  if (!user) {
    try {
      user = await authService.me();
    } catch {
      // unauthenticated
    }
  }

  const isStaff = user && (
    user.role === 'STAFF' ||
    user.role === 'ADMIN' ||
    user.role_code === 'STAFF' ||
    user.role_code === 'ADMIN' ||
    (Array.isArray(user.roles) && user.roles.some(r => ['STAFF', 'ADMIN'].includes(r)))
  );

  if (!isStaff) {
    document.title = 'Access Denied | HappyProgramming';
    root.innerHTML = StaffAccessDeniedPage(user);
    root.querySelector('#open-staff-login-btn')?.addEventListener('click', () => {
      window.location.hash = '#/login?portal=staff&return=review';
    });
    return false;
  }
  return true;
}

function bindStaffGlobalEvents(root) {
  // Bind Logout button in staff header
  root.querySelectorAll('a').forEach(link => {
    const text = link.textContent.trim().toLowerCase();
    if (text === 'logout') {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await authService.logout();
        window.location.hash = '#/login';
      });
    }
  });
}

export async function mountStaffDashboard(root) {
  document.title = 'Staff Dashboard | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-slate-500 font-semibold">Loading Staff Dashboard…</div>';

  const hasAccess = await checkStaffAccess(root);
  if (!hasAccess || !root.isConnected) return;

  try {
    const data = await staffService.getDashboard();
    if (!root.isConnected) return;
    root.innerHTML = StaffDashboardPage(data);
    bindStaffGlobalEvents(root);
  } catch (err) {
    if (!root.isConnected) return;
    root.innerHTML = StaffDashboardPage({});
    bindStaffGlobalEvents(root);
  }
}

export async function mountStaffApplications(root, initialTab = 'PENDING') {
  document.title = 'Mentor Applications Review | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-slate-500 font-semibold">Loading Applications…</div>';

  const hasAccess = await checkStaffAccess(root);
  if (!hasAccess || !root.isConnected) return;

  let activeTab = initialTab;
  let applications = [];

  const render = () => {
    root.innerHTML = StaffApplicationsPage(applications, activeTab);
    bindStaffGlobalEvents(root);

    // Tab switching
    root.querySelectorAll('[data-app-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.appTab;
        render();
      });
    });

    // Review Modal & Decision
    const dialog = root.querySelector('#app-review-dialog');
    const dialogContent = root.querySelector('#app-review-dialog-content');

    root.querySelectorAll('[data-review-app]').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.dataset.reviewApp;
        const app = applications.find(a => String(a.id) === String(appId));
        if (!app || !dialog || !dialogContent) return;

        dialogContent.innerHTML = `
          <div class="p-6 bg-white rounded-3xl space-y-5">
            <div class="flex items-center justify-between border-b border-[#e8e0f1] pb-4">
              <div>
                <h3 class="font-extrabold text-xl text-[#25143f]">${app.applicantName || app.name || 'Applicant'}</h3>
                <p class="text-xs text-slate-500">${app.email} · ${app.specialty || 'General'}</p>
              </div>
              <button type="button" id="close-review-modal" class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="space-y-3 text-sm text-slate-700">
              <p><strong>Experience:</strong> ${app.experienceYears || 'N/A'} years</p>
              <p><strong>Bio:</strong> ${app.bio || 'No bio provided'}</p>
              ${app.skills ? `<p><strong>Skills:</strong> ${(Array.isArray(app.skills) ? app.skills : [app.skills]).join(', ')}</p>` : ''}
              ${app.cvFileName ? `<div class="p-3 bg-[#f1e8ff] rounded-xl flex items-center justify-between">
                <span class="text-xs font-bold text-[#8b46e8]">📄 ${app.cvFileName}</span>
                <a href="/api/staff/mentor-applications/${app.id}/cv" download class="text-xs font-bold px-3 py-1.5 bg-[#8b46e8] text-white rounded-lg hover:bg-[#7431d0] transition-colors">Download PDF</a>
              </div>` : ''}
            </div>

            <div class="pt-4 border-t border-[#e8e0f1]">
              <label for="review-reason" class="block text-xs font-bold text-slate-600 mb-1">Feedback / Reason (required if rejecting):</label>
              <textarea id="review-reason" class="w-full p-3 text-sm border border-[#e8e0f1] rounded-xl focus:outline-none focus:border-[#8b46e8]" rows="3" placeholder="Enter review notes or rejection feedback..."></textarea>
              <p id="review-modal-error" class="text-xs text-rose-600 font-semibold mt-1 hidden"></p>

              <div class="flex justify-end gap-3 mt-4">
                <button type="button" id="btn-reject-app" class="px-4 py-2 text-xs font-bold rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors">
                  Reject Application
                </button>
                <button type="button" id="btn-approve-app" class="px-5 py-2 text-xs font-bold rounded-xl bg-[#8b46e8] text-white hover:bg-[#7431d0] shadow-xs transition-colors">
                  Approve Application
                </button>
              </div>
            </div>
          </div>
        `;

        dialog.showModal();

        dialog.querySelector('#close-review-modal')?.addEventListener('click', () => dialog.close());

        dialog.querySelector('#btn-approve-app')?.addEventListener('click', async () => {
          try {
            await staffService.approveApplication(app.id);
            dialog.close();
            applications = await staffService.getApplications();
            render();
          } catch (e) {
            const errEl = dialog.querySelector('#review-modal-error');
            if (errEl) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
          }
        });

        dialog.querySelector('#btn-reject-app')?.addEventListener('click', async () => {
          const reason = dialog.querySelector('#review-reason')?.value.trim();
          if (!reason) {
            const errEl = dialog.querySelector('#review-modal-error');
            if (errEl) { errEl.textContent = 'Please provide a rejection reason.'; errEl.classList.remove('hidden'); }
            return;
          }
          try {
            await staffService.rejectApplication(app.id, reason);
            dialog.close();
            applications = await staffService.getApplications();
            render();
          } catch (e) {
            const errEl = dialog.querySelector('#review-modal-error');
            if (errEl) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
          }
        });
      });
    });
  };

  try {
    applications = await staffService.getApplications();
  } catch {
    applications = [];
  }
  if (root.isConnected) render();
}

export async function mountStaffMentors(root) {
  document.title = 'Manage Mentors | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-slate-500 font-semibold">Loading Mentors…</div>';

  const hasAccess = await checkStaffAccess(root);
  if (!hasAccess || !root.isConnected) return;

  try {
    const mentors = await staffService.getMentors();
    if (!root.isConnected) return;
    root.innerHTML = StaffMentorsPage(mentors);
    bindStaffGlobalEvents(root);

    // Filter and search logic
    const searchInput = root.querySelector('#mentor-search-input');
    const skillFilter = root.querySelector('#mentor-skill-filter');
    const statusFilter = root.querySelector('#mentor-status-filter');
    const tableBody = root.querySelector('#mentor-table-body');

    const filterMentors = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const skill = skillFilter?.value || 'ALL';
      const status = statusFilter?.value || 'ALL';

      const filtered = mentors.filter(m => {
        const matchesQ = !q || (m.name && m.name.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q));
        const matchesSkill = skill === 'ALL' || (m.skills && m.skills.some(s => s.toLowerCase() === skill.toLowerCase()));
        const matchesStatus = status === 'ALL' || (m.status && m.status.toUpperCase() === status.toUpperCase());
        return matchesQ && matchesSkill && matchesStatus;
      });

      if (tableBody) {
        tableBody.innerHTML = filtered.length > 0 ? filtered.map((m, index) => `
          <tr class="hover:bg-[#fbf9ff] transition-colors border-b border-[#e8e0f1]">
            <td class="px-4 py-3.5 text-xs font-bold text-slate-400">${index + 1}</td>
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-[#f1e8ff] text-[#8b46e8] flex items-center justify-center font-bold text-sm">
                  ${m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M'}
                </div>
                <div>
                  <div class="font-bold text-sm text-[#25143f]">${m.name}</div>
                  <div class="text-xs text-slate-500">${m.jobTitle}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3.5 text-xs text-slate-600 font-medium">${m.email}</td>
            <td class="px-4 py-3.5">
              <div class="flex flex-wrap gap-1">
                ${(m.skills || []).map(s => `<span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#f1e8ff] text-[#8b46e8]">${s}</span>`).join('')}
              </div>
            </td>
            <td class="px-4 py-3.5 text-xs font-semibold text-slate-700">${m.experienceYears} yrs</td>
            <td class="px-4 py-3.5">
              <span class="px-2.5 py-1 text-xs font-bold rounded-full ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${m.status || 'ACTIVE'}</span>
            </td>
            <td class="px-4 py-3.5">
              <button data-view-mentor="${m.id}" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#f1e8ff] text-[#8b46e8] hover:bg-[#8b46e8] hover:text-white transition-colors">
                View Profile
              </button>
            </td>
          </tr>
        `).join('') : `
          <tr><td colspan="7" class="py-12 text-center text-sm text-slate-500">No mentors match the criteria.</td></tr>
        `;
      }
    };

    searchInput?.addEventListener('input', filterMentors);
    skillFilter?.addEventListener('change', filterMentors);
    statusFilter?.addEventListener('change', filterMentors);

  } catch {
    if (!root.isConnected) return;
    root.innerHTML = StaffMentorsPage([]);
    bindStaffGlobalEvents(root);
  }
}

export async function mountStaffMentees(root) {
  document.title = 'Manage Mentees | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-slate-500 font-semibold">Loading Mentees…</div>';

  const hasAccess = await checkStaffAccess(root);
  if (!hasAccess || !root.isConnected) return;

  try {
    const mentees = await staffService.getMentees();
    if (!root.isConnected) return;
    root.innerHTML = StaffMenteesPage(mentees);
    bindStaffGlobalEvents(root);
  } catch {
    if (!root.isConnected) return;
    root.innerHTML = StaffMenteesPage([]);
    bindStaffGlobalEvents(root);
  }
}
