import { StaffLayout } from './StaffLayout.js';
/**
 * Staff Portal Controller / Mount Handlers - HappyProgramming
 * Strictly complies with AGENTS.md, CLAUDE.md, and Shared Workspace UI standards.
 */
import { StaffDashboardPage } from './StaffDashboardPage.js';
import { StaffApplicationsPage } from './StaffApplicationsPage.js';
import { StaffMentorsPage } from './StaffMentorsPage.js';
import { StaffMenteesPage } from './StaffMenteesPage.js';
import { StaffSkillsPage } from './StaffSkillsPage.js';
import { StaffPayoutsPage } from './StaffPayoutsPage.js';
import { StaffReportsPage } from './StaffReportsPage.js';
import { StaffAccessDeniedPage } from './StaffAccessDeniedPage.js';
import { staffService } from './staffService.js';
import { authService } from '../auth/authService.js';
import { escapeHtml as e } from '../../shared/html.js';
import { Button } from '../../shared/Button.js';
import { Dialog } from '../../shared/Dialog.js';
import { StatusBadge, Notice } from '../admin/AdminPrimitives.js';
import { money, dateTime } from '../admin/admin.js';
import { buildVietQrUrl } from './vietQrHelper.js';

async function checkStaffAccess(root) {
  try {
    const { user, permissions } = await staffService.access();
    const section = location.hash.split('/')[2];
    const needed = { 'mentor-applications':'MENTOR_APPLICATION_MANAGE', applications:'MENTOR_APPLICATION_MANAGE',
      mentors:'MENTOR_APPLICATION_MANAGE', mentees:'MENTEE_MANAGE', requests:'MENTORSHIP_REQUEST_MANAGE', skills:'SKILL_MANAGE' }[section];
    if (needed && !permissions.includes(needed)) {
      staffError(root, {status:403, message:'You do not have permission to access this staff function.'});
      return null;
    }
    return user;
  } catch (error) { staffError(root,error); return null; }
}

function staffError(root,error) {
  if (!root.isConnected) return;
  document.title = error.status === 403 ? 'Access denied | HappyProgramming' : 'Staff workspace | HappyProgramming';
  root.innerHTML = StaffLayout('dashboard', `<section class="admin-panel"><div class="admin-panel-body">
    <h1 class="section-title">${error.status===403?'Access denied':'Unable to load this page'}</h1>
    <p role="alert" class="mt-4">${e(error.message || 'Please try again.')}</p>
    <div class="admin-actions"><button id="staff-retry" class="btn btn-primary">Try again</button>
    <a class="btn btn-outline" href="#/login">Log in</a></div></div></section>`);
  root.querySelector('#staff-retry').onclick=()=>location.reload();
  bindStaffGlobalEvents(root);
}

function bindStaffGlobalEvents(root) {
  // Bind Logout button in staff topbar
  root.querySelector('#staff-logout-btn')?.addEventListener('click', async () => {
    try { await authService.logout(); window.location.hash = '#/login'; }
    catch (err) { staffError(root,err); }
  });

  // Mobile navigation rail toggle
  root.querySelector('#staff-menu')?.addEventListener('click', event => {
    const open = root.querySelector('.admin-sidebar')?.classList.toggle('menu-open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });

  // Skip to content accessible action
  root.querySelector('.admin-skip')?.addEventListener('click', event => {
    event.preventDefault();
    root.querySelector('#staff-content')?.focus();
  });
}

export async function mountStaffDashboard(root) {
  document.title = 'Staff Dashboard | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading staff workspace…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  try {
    const data = await staffService.getDashboard();
    if (!root.isConnected) return;
    root.innerHTML = StaffDashboardPage(data, user);
    bindStaffGlobalEvents(root);
  } catch (err) {
    if (!root.isConnected) return;
    staffError(root,err);
  }
}

export async function mountStaffApplications(root, initialTab = 'PENDING') {
  document.title = 'Mentor Applications | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading mentor applications…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  let activeTab = initialTab;
  let applications = [];

  const render = () => {
    root.innerHTML = StaffApplicationsPage(applications, activeTab, user);
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

        const applicantName = app.applicantName || app.name || 'Applicant';

        dialogContent.innerHTML = `
          <button class="modal-close" id="close-review-modal" type="button" aria-label="Close">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6"/></svg>
          </button>
          
          <p class="eyebrow !pr-8">MENTOR CV REVIEW · SLA 48H</p>
          <h2 id="app-review-modal-title" class="mt-3 font-display text-2xl text-ink">${e(applicantName)}</h2>
          <p class="text-xs text-muted mt-1">${e(app.email)} · Track: <strong>${e(app.specialty || 'General')}</strong></p>

          <div class="mt-5 space-y-3.5 text-xs text-ink/90 border-t border-b border-line py-4">
            <p><strong>Years of experience:</strong> ${e(app.experienceYears || '0')} years</p>
            <p><strong>Bio & Background:</strong> <span class="text-muted">${e(app.bio || 'No candidate bio provided.')}</span></p>
            ${app.skills ? `<p><strong>Technical skills:</strong> ${(Array.isArray(app.skills) ? app.skills : [app.skills]).map(s => `<span class="badge !text-[10px] !py-0.5 ml-1">${e(s)}</span>`).join('')}</p>` : ''}
            
            ${app.cvFileName ? `
              <div class="mt-3 p-3 bg-lilac/40 border border-line rounded-xl flex items-center justify-between">
                <div>
                  <p class="font-semibold text-xs text-ink">CV Document: ${e(app.cvFileName)}</p>
                  <span class="text-[10px] text-muted">${e(app.cvFileSize || 'PDF Document')}</span>
                </div>
                <a href="/api/staff/mentor-applications/${app.id}/cv" download class="btn btn-outline btn-sm">
                  Download PDF
                </a>
              </div>
            ` : ''}
          </div>

          ${app.status === 'PENDING' ? `
            <form id="app-decision-form" class="mt-4 space-y-3">
              <label class="admin-field" for="review-reason">
                Review feedback / note (Required if rejecting):
                <textarea id="review-reason" rows="3" placeholder="Provide constructive feedback or state reason for rejection..."></textarea>
              </label>
              <p id="review-modal-error" class="text-xs text-rose-600 font-semibold hidden" role="alert"></p>

              <div class="admin-actions">
                <button type="button" id="btn-reject-app" class="btn btn-outline">
                  Reject candidate
                </button>
                <button type="button" id="btn-approve-app" class="btn btn-primary">
                  Approve & promote to Mentor
                </button>
              </div>
            </form>
          ` : `
            <div class="mt-4 p-3.5 rounded-xl border ${app.status === 'APPROVED' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'} text-xs space-y-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${app.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-rose-600'}"></span>
                <strong>Status: ${e(app.status)}</strong>
              </div>
              ${app.reviewNote ? `<p class="mt-1 text-ink/80 leading-relaxed">${e(app.reviewNote)}</p>` : ''}
            </div>
            <div class="admin-actions mt-4">
              <button type="button" id="btn-close-modal-footer" class="btn btn-outline">Close</button>
            </div>
          `}
        `;

        dialog.showModal();

        dialog.querySelector('#close-review-modal')?.addEventListener('click', () => dialog.close());
        dialog.querySelector('#btn-close-modal-footer')?.addEventListener('click', () => dialog.close());

        const approveBtn = dialog.querySelector('#btn-approve-app');
        const rejectBtn = dialog.querySelector('#btn-reject-app');
        const errEl = dialog.querySelector('#review-modal-error');

        approveBtn?.addEventListener('click', async () => {
          if (errEl) errEl.classList.add('hidden');
          approveBtn.disabled = true;
          if (rejectBtn) rejectBtn.disabled = true;
          approveBtn.textContent = 'Processing approval…';
          try {
            await staffService.approveApplication(app.id);
            dialog.close();
            applications = await staffService.getApplications();
            render();
          } catch (err) {
            approveBtn.disabled = false;
            if (rejectBtn) rejectBtn.disabled = false;
            approveBtn.textContent = 'Approve & promote to Mentor';
            if (errEl) { errEl.textContent = err.message || 'Approval failed. Please check network or try again.'; errEl.classList.remove('hidden'); }
          }
        });

        rejectBtn?.addEventListener('click', async () => {
          const reason = dialog.querySelector('#review-reason')?.value.trim();
          if (!reason) {
            if (errEl) { errEl.textContent = 'Please provide a constructive reason when rejecting an application.'; errEl.classList.remove('hidden'); }
            return;
          }
          if (errEl) errEl.classList.add('hidden');
          rejectBtn.disabled = true;
          if (approveBtn) approveBtn.disabled = true;
          rejectBtn.textContent = 'Processing rejection…';
          try {
            await staffService.rejectApplication(app.id, reason);
            dialog.close();
            applications = await staffService.getApplications();
            render();
          } catch (err) {
            rejectBtn.disabled = false;
            if (approveBtn) approveBtn.disabled = false;
            rejectBtn.textContent = 'Reject candidate';
            if (errEl) { errEl.textContent = err.message || 'Rejection failed. Please try again.'; errEl.classList.remove('hidden'); }
          }
        });
      });
    });
  };

  try {
    applications = await staffService.getApplications();
  } catch (err) {
    staffError(root,err); return;
  }
  if (root.isConnected) render();
}

export async function mountStaffMentors(root) {
  document.title = 'Manager Mentors | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading mentors…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  try {
    const mentors = await staffService.getMentors();
    if (!root.isConnected) return;
    root.innerHTML = StaffMentorsPage(mentors, user);
    bindStaffGlobalEvents(root);

    const searchInput = root.querySelector('#mentor-search-input');
    const skillFilter = root.querySelector('#mentor-skill-filter');
    const statusFilter = root.querySelector('#mentor-status-filter');
    const container = root.querySelector('#mentor-table-container');

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

      const rows = filtered.map(m => {
        const initials = (m.name || 'M').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
        return [
          `<div class="admin-person"><span class="admin-avatar">${e(initials)}</span><div><strong>${e(m.name)}</strong><small>${e(m.jobTitle || 'Mentor')}</small></div></div>`,
          e(m.email),
          `<div class="flex flex-wrap gap-1">${(m.skills || []).map(s => `<span class="badge !text-[10px] !py-0.5">${e(s)}</span>`).join('')}</div>`,
          `${e(m.experienceYears || '0')} yrs`,
          StatusBadge(m.status || 'ACTIVE'),
          `<button class="btn btn-outline btn-sm" data-view-mentor="${m.id}">View profile</button>`
        ];
      });

      if (container) {
        if (rows.length === 0) {
          container.innerHTML = '<div class="p-12 text-center text-muted text-xs">No mentors found matching the criteria.</div>';
        } else {
          container.innerHTML = `
            <div class="data-table-scroll" role="region" aria-label="Mentor directory" tabindex="0">
              <table class="data-table">
                <caption class="sr-only">Mentor directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Mentor</th>
                    <th scope="col">Email address</th>
                    <th scope="col">Skills</th>
                    <th scope="col">Experience</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
        bindMentorDetailButtons();
      }
    };

    function bindMentorDetailButtons() {
      root.querySelectorAll('[data-view-mentor]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mentorId = btn.dataset.viewMentor;
          const mentor = mentors.find(m => String(m.id) === String(mentorId));
          const dialog = root.querySelector('#mentor-detail-dialog');
          const content = root.querySelector('#mentor-detail-dialog-content');
          if (!mentor || !dialog || !content) return;

          content.innerHTML = `
            <button class="modal-close" id="close-mentor-modal" type="button" aria-label="Close">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6"/></svg>
            </button>
            <p class="eyebrow !pr-8">MENTOR PROFILE DETAILS</p>
            <h2 id="mentor-detail-modal-title" class="mt-3 font-display text-2xl text-ink">${e(mentor.name)}</h2>
            <p class="text-xs text-muted mt-1">${e(mentor.jobTitle || 'Senior Software Engineer')} · ${e(mentor.email)}</p>

            <div class="mt-5 space-y-3.5 text-xs text-ink/90 border-t border-b border-line py-4">
              <p><strong>Experience:</strong> ${e(mentor.experienceYears || '0')} years</p>
              <p><strong>Monthly rate:</strong> ${e(mentor.monthlyPrice || '2,000,000')} VND/mo</p>
              <p><strong>1-on-1 Session:</strong> ${e(mentor.sessionPrice || '400,000')} VND/session</p>
              <p><strong>Biography:</strong> <span class="text-muted">${e(mentor.bio || 'No detailed biography provided.')}</span></p>
              <p><strong>Technical Skills:</strong> ${(mentor.skills || []).map(s => `<span class="badge !text-[10px] !py-0.5 ml-1">${e(s)}</span>`).join('')}</p>
            </div>

            <div class="admin-actions">
              <button type="button" id="btn-done-mentor" class="btn btn-outline">Close</button>
            </div>
          `;

          dialog.showModal();
          dialog.querySelector('#close-mentor-modal')?.addEventListener('click', () => dialog.close());
          dialog.querySelector('#btn-done-mentor')?.addEventListener('click', () => dialog.close());
        });
      });
    }

    searchInput?.addEventListener('input', filterMentors);
    skillFilter?.addEventListener('change', filterMentors);
    statusFilter?.addEventListener('change', filterMentors);
    bindMentorDetailButtons();

  } catch (err) {
    staffError(root,err);
  }
}

export async function mountStaffMentees(root) {
  document.title = 'Manager Mentees | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading mentees…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  try {
    const mentees = await staffService.getMentees();
    if (!root.isConnected) return;
    root.innerHTML = StaffMenteesPage(mentees, user);
    bindStaffGlobalEvents(root);

    const searchInput = root.querySelector('#mentee-search-input');
    const statusFilter = root.querySelector('#mentee-status-filter');
    const container = root.querySelector('#mentee-table-container');

    const filterMentees = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const status = statusFilter?.value || 'ALL';

      const filtered = mentees.filter(m => {
        const matchesQ = !q || (m.name && m.name.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q));
        const matchesStatus = status === 'ALL' || (m.status && m.status.toUpperCase() === status.toUpperCase());
        return matchesQ && matchesStatus;
      });

      const rows = filtered.map(m => {
        const initials = (m.name || 'U').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
        return [
          `<div class="admin-person"><span class="admin-avatar">${e(initials)}</span><div><strong>${e(m.name)}</strong><small>${m.emailVerified ? 'Email verified' : 'Unverified email'}</small></div></div>`,
          e(m.email),
          e(m.registeredDate || 'Recent'),
          `<span class="badge !text-[10px] !py-0.5">${e(m.requestsCount || 0)} requests</span>`,
          StatusBadge(m.status || 'ACTIVE'),
          `<button class="btn btn-outline btn-sm" data-view-mentee="${m.id}">View details</button>`
        ];
      });

      if (container) {
        if (rows.length === 0) {
          container.innerHTML = '<div class="p-12 text-center text-muted text-xs">No mentees found matching the criteria.</div>';
        } else {
          container.innerHTML = `
            <div class="data-table-scroll" role="region" aria-label="Mentee directory" tabindex="0">
              <table class="data-table">
                <caption class="sr-only">Mentee directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Mentee</th>
                    <th scope="col">Email address</th>
                    <th scope="col">Registered on</th>
                    <th scope="col">Requests</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
        bindMenteeDetailButtons();
      }
    };

    function bindMenteeDetailButtons() {
      root.querySelectorAll('[data-view-mentee]').forEach(btn => {
        btn.addEventListener('click', () => {
          const menteeId = btn.dataset.viewMentee;
          const mentee = mentees.find(m => String(m.id) === String(menteeId));
          const dialog = root.querySelector('#mentee-detail-dialog');
          const content = root.querySelector('#mentee-detail-dialog-content');
          if (!mentee || !dialog || !content) return;

          content.innerHTML = `
            <button class="modal-close" id="close-mentee-modal" type="button" aria-label="Close">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6"/></svg>
            </button>
            <p class="eyebrow !pr-8">MENTEE ACCOUNT DETAILS</p>
            <h2 id="mentee-detail-modal-title" class="mt-3 font-display text-2xl text-ink">${e(mentee.name)}</h2>
            <p class="text-xs text-muted mt-1">${e(mentee.email)} · Registered on: ${e(mentee.registeredDate || 'Recent')}</p>

            <div class="mt-5 space-y-3.5 text-xs text-ink/90 border-t border-b border-line py-4">
              <p><strong>Account status:</strong> ${StatusBadge(mentee.status || 'ACTIVE')}</p>
              <p><strong>Email verification:</strong> ${mentee.emailVerified ? '<span class="text-emerald-700 font-semibold">Verified</span>' : '<span class="text-amber-700 font-semibold">Pending verification</span>'}</p>
              <p><strong>Submitted mentorship requests:</strong> ${e(mentee.requestsCount || 0)} requests</p>
            </div>

            <div class="admin-actions">
              <button type="button" id="btn-done-mentee" class="btn btn-outline">Close</button>
            </div>
          `;

          dialog.showModal();
          dialog.querySelector('#close-mentee-modal')?.addEventListener('click', () => dialog.close());
          dialog.querySelector('#btn-done-mentee')?.addEventListener('click', () => dialog.close());
        });
      });
    }

    searchInput?.addEventListener('input', filterMentees);
    statusFilter?.addEventListener('change', filterMentees);
    bindMenteeDetailButtons();

  } catch (err) {
    staffError(root,err);
  }
}

export async function mountStaffList(root, kind) {
  if (kind === 'skills') {
    return mountStaffSkills(root);
  }
  document.title = `${kind === 'skills' ? 'Technical skills' : 'Mentorship requests'} | HappyProgramming`;
  root.innerHTML='<p role="status">Loading…</p>';
  const user=await checkStaffAccess(root); if (!user || !root.isConnected) return;
  try {
    const records=await (kind==='skills'?staffService.getSkills():staffService.getRequests());
    const headings=kind==='skills'?['Name','Category','Status','Description']:['ID','Mentee','Mentor','Status','Learning goals','Created (UTC)'];
    const rows=records.map(r=>kind==='skills'?[r.name,r.category,r.active?'Active':'Inactive',r.description]:[r.id,r.mentee,r.mentor,r.status,r.learningGoals,r.createdAt]);
    if (!root.isConnected) return;
    root.innerHTML=StaffLayout(kind,`<div class="admin-page-heading"><div><p class="eyebrow">STAFF WORKSPACE</p><h1>${kind==='skills'?'Technical skills':'Mentorship requests'}</h1><p>Read-only directory</p></div></div>
      <section class="admin-panel"><div class="data-table-scroll"><table class="data-table"><caption class="sr-only">${e(kind)} directory</caption><thead><tr>${headings.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(row=>`<tr>${row.map(v=>`<td>${e(v??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${!rows.length?'<p class="admin-panel-body">No records found.</p>':''}</section>`,user);
    bindStaffGlobalEvents(root);
  } catch(err) { staffError(root,err); }
}

export async function mountStaffSkills(root) {
  document.title = 'Technical skills | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading technical skills…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  let skills = [];
  let categories = [];

  const refreshData = async () => {
    try {
      const [s, c] = await Promise.all([
        staffService.getSkills(),
        staffService.getSkillCategories()
      ]);
      skills = Array.isArray(s) ? s : [];
      categories = Array.isArray(c) ? c : [];
    } catch (err) {
      staffError(root, err);
      return false;
    }
    return true;
  };

  const render = () => {
    if (!root.isConnected) return;
    root.innerHTML = StaffSkillsPage(skills, categories, user);
    bindStaffGlobalEvents(root);

    const searchInput = root.querySelector('#skill-search-input');
    const categoryFilter = root.querySelector('#skill-category-filter');
    const statusFilter = root.querySelector('#skill-status-filter');
    const container = root.querySelector('#skills-table-container');

    const dialog = root.querySelector('#skill-form-dialog');
    const form = root.querySelector('#skill-modal-form');
    const modalTitle = root.querySelector('#skill-modal-title');
    const editIdInput = root.querySelector('#skill-edit-id');
    const nameInput = root.querySelector('#skill-name-input');
    const categoryInput = root.querySelector('#skill-category-input');
    const descInput = root.querySelector('#skill-description-input');
    const activeInput = root.querySelector('#skill-active-input');
    const errorEl = root.querySelector('#skill-form-error');
    const saveBtn = root.querySelector('#btn-save-skill');

    const filterSkills = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const categoryId = categoryFilter?.value || 'ALL';
      const status = statusFilter?.value || 'ALL';

      const filtered = skills.filter(s => {
        const matchesQ = !q || (s.name && s.name.toLowerCase().includes(q)) || (s.slug && s.slug.toLowerCase().includes(q));
        const matchesCategory = categoryId === 'ALL' || String(s.categoryId) === String(categoryId);
        const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? s.active : !s.active);
        return matchesQ && matchesCategory && matchesStatus;
      });

      const rows = filtered.map(s => {
        return [
          `<div class="font-semibold text-ink">${e(s.name)} <span class="badge !text-[9px] !py-0.5 ml-1 text-muted font-normal">${e(s.slug || '')}</span></div>`,
          `<span class="badge !text-[10px] !py-0.5">${e(s.category || 'General')}</span>`,
          `<span class="text-xs text-muted max-w-xs truncate block">${e(s.description || '—')}</span>`,
          StatusBadge(s.active ? 'ACTIVE' : 'INACTIVE'),
          `<div class="flex items-center gap-2">
            <button class="btn btn-outline btn-sm" data-edit-skill="${s.id}">Edit</button>
            <button class="btn btn-outline btn-sm ${s.active ? '!text-amber-700 hover:!bg-amber-50' : '!text-emerald-700 hover:!bg-emerald-50'}" data-toggle-skill="${s.id}">
              ${s.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>`
        ];
      });

      if (container) {
        if (rows.length === 0) {
          container.innerHTML = '<div class="p-12 text-center text-muted text-xs">No technical skills found matching the criteria.</div>';
        } else {
          container.innerHTML = `
            <div class="data-table-scroll" role="region" aria-label="Skills directory" tabindex="0">
              <table class="data-table">
                <caption class="sr-only">Technical skills directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Skill Name & Slug</th>
                    <th scope="col">Domain Category</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
        bindTableActionButtons();
      }
    };

    const openModal = (skill = null) => {
      if (!dialog) return;
      if (errorEl) errorEl.classList.add('hidden');
      if (skill) {
        modalTitle.textContent = `Edit skill: ${skill.name}`;
        editIdInput.value = skill.id;
        nameInput.value = skill.name || '';
        categoryInput.value = skill.categoryId || '';
        descInput.value = skill.description || '';
        activeInput.checked = Boolean(skill.active);
      } else {
        modalTitle.textContent = 'Add new skill';
        editIdInput.value = '';
        form.reset();
        activeInput.checked = true;
      }
      dialog.showModal();
    };

    root.querySelector('#btn-open-add-skill')?.addEventListener('click', () => openModal(null));
    dialog?.querySelector('#close-skill-modal')?.addEventListener('click', () => dialog.close());
    dialog?.querySelector('#btn-cancel-skill')?.addEventListener('click', () => dialog.close());

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const id = editIdInput.value;
      const name = nameInput.value.trim();
      const categoryId = Number(categoryInput.value);
      const description = descInput.value.trim();
      const active = activeInput.checked;

      if (!name || !categoryId) {
        if (errorEl) { errorEl.textContent = 'Please fill in all required fields.'; errorEl.classList.remove('hidden'); }
        return;
      }

      if (errorEl) errorEl.classList.add('hidden');
      saveBtn.disabled = true;
      saveBtn.textContent = id ? 'Saving changes…' : 'Creating skill…';

      try {
        if (id) {
          await staffService.updateSkill(id, { name, categoryId, description, active });
        } else {
          await staffService.createSkill({ name, categoryId, description, active });
        }
        dialog.close();
        if (await refreshData()) render();
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save skill';
        if (errorEl) { errorEl.textContent = err.message || 'Operation failed. Please try again.'; errorEl.classList.remove('hidden'); }
      }
    });

    function bindTableActionButtons() {
      root.querySelectorAll('[data-edit-skill]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.editSkill;
          const skill = skills.find(s => String(s.id) === String(id));
          if (skill) openModal(skill);
        });
      });

      root.querySelectorAll('[data-toggle-skill]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.toggleSkill;
          const skill = skills.find(s => String(s.id) === String(id));
          if (!skill) return;
          btn.disabled = true;
          try {
            await staffService.toggleSkillStatus(id, !skill.active);
            if (await refreshData()) render();
          } catch (err) {
            alert(err.message || 'Unable to update skill status.');
            btn.disabled = false;
          }
        });
      });
    }

    searchInput?.addEventListener('input', filterSkills);
    categoryFilter?.addEventListener('change', filterSkills);
    statusFilter?.addEventListener('change', filterSkills);
    filterSkills();
  };

  if (await refreshData()) render();
}

export async function mountStaffPayouts(root) {
  document.title = 'Mentor Payouts | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading mentor payouts…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  let requests = [];
  let notice = null;

  async function loadData() {
    try {
      requests = await staffService.getPayoutRequests();
      render();
    } catch (err) {
      if (!root.isConnected) return;
      staffError(root, err);
    }
  }

  function render(query = '') {
    if (!root.isConnected) return;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? requests.filter(r =>
          (r.mentorName || '').toLowerCase().includes(q) ||
          (r.mentorEmail || '').toLowerCase().includes(q) ||
          (r.bankName || '').toLowerCase().includes(q) ||
          (r.accountName || '').toLowerCase().includes(q)
        )
      : requests;

    root.innerHTML = StaffPayoutsPage(filtered, user, notice);
    bindStaffGlobalEvents(root);
    bindCopyButtons(root);

    const searchInput = root.querySelector('#staff-payout-query');
    if (searchInput) {
      searchInput.value = query;
      searchInput.addEventListener('input', event => {
        render(event.target.value);
        const nextInput = root.querySelector('#staff-payout-query');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    root.querySelectorAll('[data-payout-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.payoutApprove);
        const item = requests.find(r => r.id === id);
        if (!item) return;

        openPayoutDialog({
          title: 'Verify & approve payout request',
          eyebrow: 'STAFF REVIEW WORKFLOW',
          prompt: `
            <div class="mb-4 rounded-xl border border-line bg-cream p-4">
              <div class="flex items-center justify-between mb-3 pb-2 border-b border-line">
                <div>
                  <span class="text-xs font-semibold uppercase tracking-wider text-brand">Verification Summary</span>
                  <p class="text-xs text-muted">Confirm mentor withdrawal information before approving for Admin payment.</p>
                </div>
                <span class="text-xs font-bold text-ink bg-lilac/70 px-2 py-0.5 rounded">Payout #${e(item.id)}</span>
              </div>

              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between pb-1.5 border-b border-line/50">
                  <span class="text-muted">Mentor:</span>
                  <span class="font-semibold text-ink">${e(item.mentorName)} <span class="text-muted font-normal">(${e(item.mentorEmail)})</span></span>
                </div>
                <div class="flex items-center justify-between pb-1.5 border-b border-line/50">
                  <span class="text-muted">Bank name:</span>
                  <strong class="text-ink">${e(item.bankName)}</strong>
                </div>
                <div class="flex items-center justify-between pb-1.5 border-b border-line/50">
                  <span class="text-muted">Account number (STK):</span>
                  <strong class="font-mono text-ink text-sm bg-lilac/50 px-1.5 py-0.5 rounded">${e(item.accountNumber)}</strong>
                </div>
                <div class="flex items-center justify-between pb-1.5 border-b border-line/50">
                  <span class="text-muted">Account holder:</span>
                  <span class="font-semibold text-ink">${e(item.accountName)}</span>
                </div>
                <div class="flex items-center justify-between pb-1.5 border-b border-line/50">
                  <span class="text-muted">Transfer amount:</span>
                  <span class="text-brand font-bold text-sm">${money(item.netAmount ?? item.amount)}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted">Withdrawal fee:</span>
                  <span class="text-ink">${money(item.feeAmount || 0)}</span>
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
              <p>Approving this request verifies the mentor's banking details and forwards it to <strong>Admin</strong> to execute the bank transfer. Funds remain reserved in the mentor's wallet until payment is completed.</p>
            </div>`,
          action: async () => {
            await staffService.decidePayout(id, { decision: 'APPROVED' });
            notice = { message: `Payout #${id} approved and forwarded to Admin for bank transfer.`, type: 'info' };
            await loadData();
          }
        });
      });
    });

    root.querySelectorAll('[data-payout-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.payoutReject);
        const item = requests.find(r => r.id === id);
        if (!item) return;
        openPayoutDialog({
          title: 'Reject payout request',
          eyebrow: 'REJECT WITHDRAWAL',
          prompt: `
            <div class="mb-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <p class="text-sm text-ink mb-1">You are rejecting payout request <strong>#${e(item.id)}</strong> for <strong>${e(item.mentorName)}</strong>.</p>
              <p class="text-xs text-muted">The reserved amount (<strong>${money(item.amount || 0)}</strong>) will be restored to the mentor’s available balance immediately.</p>
            </div>
            <label class="admin-field mt-3 font-semibold text-ink">
              Reason for rejection <span class="text-rose-600">*</span>
              <textarea name="reason" rows="3" maxlength="500" required class="w-full mt-1" placeholder="Explain why this withdrawal cannot be processed (e.g. bank account mismatch, invalid details)..."></textarea>
            </label>`,
          action: async (form) => {
            const rejectionReason = form.elements.reason.value.trim();
            if (!rejectionReason) throw new Error('Provide a reason for rejecting this payout.');
            await staffService.decidePayout(id, { decision: 'REJECTED', rejectionReason });
            notice = { message: `Payout #${id} rejected. Reserved funds restored to mentor available balance.`, type: 'info' };
            await loadData();
          }
        });
      });
    });
  }

  function bindCopyButtons(container) {
    if (!container) return;
    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const text = btn.dataset.copy;
        if (!text) return;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
          const originalContent = btn.innerHTML;
          btn.innerHTML = '✓ Copied';
          btn.classList.add('text-emerald-700', 'font-semibold');
          setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('text-emerald-700', 'font-semibold');
          }, 1800);
        } catch (err) {
          console.error('Failed to copy text', err);
        }
      });
    });
  }

  function openPayoutDialog({ title, eyebrow, prompt, action }) {
    const host = document.createElement('div');
    host.innerHTML = Dialog({
      id: 'staff-payout-dialog',
      title: e(title),
      eyebrow: e(eyebrow),
      content: `<form id="staff-payout-form">
                  ${prompt}
                  <div id="staff-dialog-error" class="mt-4"></div>
                  <div class="admin-actions mt-6">
                    ${Button({ label: 'Cancel', variant: 'outline', id: 'staff-payout-cancel' })}
                    ${Button({ label: 'Confirm decision', type: 'submit', variant: 'primary', id: 'staff-payout-submit' })}
                  </div>
                </form>`
    });
    root.append(host);
    const dialog = host.querySelector('dialog');
    dialog.showModal();
    bindCopyButtons(host);

    host.querySelectorAll('[data-close], #staff-payout-cancel').forEach(b => b.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => host.remove());

    let busy = false;
    host.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const form = event.currentTarget;
      busy = true;
      host.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        await action(form);
        dialog.close();
      } catch (err) {
        busy = false;
        host.querySelectorAll('button').forEach(b => { b.disabled = false; });
        const errorEl = host.querySelector('#staff-dialog-error');
        if (errorEl) errorEl.innerHTML = Notice({ message: err.message || 'Operation failed.', type: 'error' });
      }
    });
  }

  await loadData();
}

export async function mountStaffReports(root) {
  document.title = 'Manage Reports & Disputes | HappyProgramming';
  root.innerHTML = '<div class="min-h-screen bg-[#fbf9ff] flex items-center justify-center p-8 text-muted text-xs font-medium">Loading reports and dispute queue…</div>';

  const user = await checkStaffAccess(root);
  if (!user || !root.isConnected) return;

  let reports = [];
  let filters = { query: '', status: 'ALL', category: 'ALL' };
  let notice = null;

  async function loadData() {
    try {
      reports = await staffService.getReports();
      render();
    } catch (err) {
      if (!root.isConnected) return;
      staffError(root, err);
    }
  }

  function render() {
    if (!root.isConnected) return;
    root.innerHTML = StaffReportsPage(reports, filters, user, notice);
    bindStaffGlobalEvents(root);

    const searchInput = root.querySelector('#staff-report-query');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filters.query = e.target.value;
        render();
        const nextInput = root.querySelector('#staff-report-query');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    const statusSelect = root.querySelector('#staff-report-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        filters.status = e.target.value;
        render();
      });
    }

    const categorySelect = root.querySelector('#staff-report-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        filters.category = e.target.value;
        render();
      });
    }

    const resetBtn = root.querySelector('#staff-report-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filters = { query: '', status: 'ALL', category: 'ALL' };
        render();
      });
    }

    const dialog = root.querySelector('#report-detail-dialog');
    const dialogContent = root.querySelector('#report-detail-dialog-content');

    root.querySelectorAll('[data-review-report]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reviewReport;
        if (!dialog || !dialogContent) return;

        dialogContent.innerHTML = '<div class="p-8 text-center text-muted text-xs">Loading dispute details…</div>';
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }

        try {
          const detail = await staffService.getReportDetail(id);
          renderModalContent(detail);
        } catch (err) {
          dialogContent.innerHTML = `
            <button class="modal-close" type="button" aria-label="Close" id="close-report-error">✕</button>
            <div class="p-6">
              <h2 class="font-display text-xl text-ink mb-2">Error loading report</h2>
              <p class="text-xs text-rose-700">${e(err.message || 'Unable to load report details.')}</p>
            </div>
          `;
          dialogContent.querySelector('#close-report-error')?.addEventListener('click', () => dialog.close());
        }
      });
    });

    function renderModalContent(detail) {
      const isResolved = detail.status === 'RESOLVED' || detail.status === 'REJECTED';
      const isApproved = detail.status === 'APPROVED';
      const isSubmitted = detail.status === 'SUBMITTED';

      const evidencesHtml = detail.evidences && detail.evidences.length > 0
        ? `
          <div class="mt-4">
            <h3 class="text-xs font-semibold text-ink uppercase tracking-wider mb-2">Attached Evidence (${detail.evidences.length})</h3>
            <div class="space-y-2">
              ${detail.evidences.map(ev => `
                <div class="flex items-center justify-between p-3 rounded-lg bg-cream border border-line text-xs">
                  <div>
                    <span class="font-medium text-ink">${e(ev.fileName)}</span>
                    <span class="text-muted ml-2">(${e(ev.fileSize || 'Evidence')})</span>
                    <div class="text-[11px] text-muted">Uploaded by <strong>${e(ev.uploaderName || 'User')}</strong> · ${e(dateTime(ev.uploadedAt))}</div>
                  </div>
                  <a href="/api/staff/reports/${e(detail.id)}/evidence/${e(ev.id)}" target="_blank" download class="btn btn-outline btn-sm">
                    Download
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        `
        : '<p class="mt-4 text-xs text-muted italic">No attached evidence files submitted.</p>';

      let actionsHtml = '';
      if (isApproved) {
        actionsHtml = `
          <div class="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
            <span class="text-xs font-semibold uppercase tracking-wider text-amber-900">Refund Approved · Awaiting Admin Bank Transfer</span>
            <p class="mt-1 text-xs text-ink font-medium">Outcome: <span class="badge !text-[10px] ml-1 bg-amber-100 text-amber-900">${e(detail.resolutionType || 'FULL_REFUND')}</span></p>
            ${detail.resolutionNote ? `<p class="mt-1 text-xs text-muted">Notes: ${e(detail.resolutionNote)}</p>` : ''}
            <div class="mt-2 text-xs flex gap-4 text-ink">
              <span>Approved Refund: <strong>${money(detail.refundAmount)}</strong></span>
            </div>
            ${detail.bankName ? `
              <div class="mt-2 p-2.5 rounded-lg bg-white/90 border border-amber-200 text-xs text-ink">
                <span>Mentee Bank: <strong>${e(detail.bankName)}</strong> · Account: <strong>${e(detail.accountNumber)}</strong> (${e(detail.accountName)})</span>
              </div>
            ` : ''}
            ${detail.approvedByName ? `<p class="mt-2 text-[11px] text-muted">Approved by Staff: <strong>${e(detail.approvedByName)}</strong> at ${e(dateTime(detail.approvedAt))}</p>` : ''}
            <p class="mt-2 text-[11px] text-amber-800 italic">Dispute is in Administrator payout queue. Admin will transfer funds via bank and record the transaction reference.</p>
          </div>
        `;
      } else if (isResolved) {
        actionsHtml = `
          <div class="mt-5 p-4 rounded-xl bg-lilac/30 border border-line">
            <span class="text-xs font-semibold uppercase tracking-wider text-brand">Case Resolution</span>
            <p class="mt-1 text-xs text-ink font-medium">Outcome: <span class="badge !text-[10px] ml-1">${e(detail.resolutionType || detail.status)}</span></p>
            ${detail.resolutionNote ? `<p class="mt-1 text-xs text-muted">Notes: ${e(detail.resolutionNote)}</p>` : ''}
            <div class="mt-2 text-xs flex gap-4 text-ink">
              <span>Mentee Refund: <strong>${money(detail.refundAmount)}</strong></span>
            </div>
            ${detail.bankName ? `
              <div class="mt-2 p-2.5 rounded-lg bg-white border border-line text-xs text-ink">
                <span>Bank: <strong>${e(detail.bankName)}</strong> · Account: <strong>${e(detail.accountNumber)}</strong> (${e(detail.accountName)})</span>
                ${detail.transferReference ? `<div class="mt-1 text-muted">Transfer Ref: <strong class="font-mono text-ink">${e(detail.transferReference)}</strong></div>` : ''}
              </div>
            ` : ''}
            ${detail.resolvedBy ? `<p class="mt-1 text-[11px] text-muted">Resolved by: ${e(detail.resolvedBy)} at ${e(dateTime(detail.resolvedAt))}</p>` : ''}
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="mt-5 space-y-4 border-t border-line pt-4">
            ${isSubmitted ? `
              <div class="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <h4 class="text-xs font-bold text-amber-900">Step 1: Intake & Triage</h4>
                  <p class="text-[11px] text-amber-800">Move ticket into mediation room to notify parties and freeze hold.</p>
                </div>
                <button type="button" class="btn btn-primary btn-sm" id="btn-intake-dispute">Intake Case</button>
              </div>
            ` : ''}

            <div>
              <h4 class="text-xs font-bold text-ink uppercase tracking-wider mb-2">Step 2: Adjudicate & Finalize Resolution</h4>
              <form id="dispute-resolve-form" class="space-y-3">
                <div id="dispute-resolve-error" class="hidden"></div>
                <label class="admin-field" for="resolve-outcome">
                  Settlement Outcome
                  <select id="resolve-outcome" name="outcome" required>
                    <option value="FULL_REFUND">Full refund to mentee (100% mentee - forwards to Admin)</option>
                    <option value="PARTIAL_REFUND">Partial refund to mentee (forwards to Admin)</option>
                    <option value="REJECTED">Reject dispute / Claim denied</option>
                    <option value="RESCHEDULE">Reschedule session / Mentorship continued</option>
                  </select>
                </label>

                <div id="split-amounts-row">
                  <label class="admin-field" for="resolve-mentee-refund">
                    Mentee Refund (VND)
                    <input type="number" id="resolve-mentee-refund" name="menteeRefundAmount" value="${detail.disputedAmount || 0}" min="0" max="${detail.disputedAmount || 0}" step="1000" />
                  </label>
                </div>

                <div id="resolve-bank-container" class="p-3 rounded-xl bg-cream border border-line space-y-2">
                  <p class="text-[11px] font-semibold text-ink uppercase tracking-wider">Mentee Receiving Bank Account</p>
                  <p class="text-[11px] text-muted">Admin requires these details to execute the bank transfer.</p>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label class="admin-field" for="resolve-bank-name">
                      Bank Name
                      <input id="resolve-bank-name" name="bankName" type="text" value="${e(detail.bankName || '')}" placeholder="e.g. Vietcombank" maxlength="100">
                    </label>
                    <label class="admin-field" for="resolve-account-number">
                      Account Number
                      <input id="resolve-account-number" name="accountNumber" type="text" value="${e(detail.accountNumber || '')}" placeholder="e.g. 1029384756" maxlength="50">
                    </label>
                    <label class="admin-field" for="resolve-account-name">
                      Account Name
                      <input id="resolve-account-name" name="accountName" type="text" value="${e(detail.accountName || '')}" placeholder="e.g. NGUYEN VAN A" maxlength="150">
                    </label>
                  </div>
                </div>

                <label class="admin-field" for="resolve-notes">
                  Resolution Explanation / Findings (Required for audit)
                  <textarea id="resolve-notes" name="resolutionNotes" rows="3" placeholder="Document investigation findings, policy basis, and instructions..." required minlength="10" maxlength="2000"></textarea>
                </label>

                <p class="text-[11px] text-muted italic">Note: When approving a refund, Staff validates the complaint and forwards the request to Admin. Admin executes the bank transfer and marks the payout completed.</p>

                <div class="admin-actions mt-3">
                  <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-resolve">Cancel</button>
                  <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-resolve">Confirm & Submit Decision</button>
                </div>
              </form>
            </div>
          </div>
        `;
      }

      dialogContent.innerHTML = `
        <button class="modal-close" type="button" aria-label="Close" id="close-report-modal">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6"/></svg>
        </button>

        <p class="eyebrow !pr-8">DISPUTE MEDIATION · TICKET #${e(detail.ticketCode)}</p>
        <h2 id="report-dialog-title" class="mt-2 font-display text-2xl text-ink">${e(detail.title || 'Mentorship Complaint')}</h2>
        
        <div class="flex items-center gap-2 mt-1">
          <span class="badge !text-[10px]">${e(detail.targetType)}</span>
          <span class="badge !text-[10px]">${e(detail.category ? detail.category.replaceAll('_', ' ') : 'GENERAL')}</span>
          <span class="text-xs text-muted">Amount: <strong class="text-ink">${money(detail.disputedAmount)}</strong></span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4 p-3 rounded-xl bg-cream border border-line text-xs">
          <div>
            <span class="text-muted block text-[11px]">Complainant (Mentee)</span>
            <strong class="text-ink text-sm">${e(detail.complainantName)}</strong>
            <span class="text-muted block">${e(detail.complainantEmail)}</span>
          </div>
          <div>
            <span class="text-muted block text-[11px]">Respondent (Mentor)</span>
            <strong class="text-ink text-sm">${e(detail.respondentName)}</strong>
            <span class="text-muted block">${e(detail.respondentEmail)}</span>
          </div>
        </div>

        <div class="mt-4 text-xs text-ink/90">
          <h3 class="font-semibold uppercase tracking-wider text-[11px] text-muted mb-1">Mentee Statement & Reason</h3>
          <div class="p-3 rounded-lg bg-white border border-line whitespace-pre-wrap leading-relaxed">${e(detail.reason || 'No description provided.')}</div>
        </div>

        ${detail.mentorStatement ? `
          <div class="mt-4 text-xs text-ink/90">
            <h3 class="font-semibold uppercase tracking-wider text-[11px] text-muted mb-1">Mentor Rebuttal Statement</h3>
            <div class="p-3 rounded-lg bg-white border border-line whitespace-pre-wrap leading-relaxed">${e(detail.mentorStatement)}</div>
          </div>
        ` : ''}

        ${evidencesHtml}
        ${actionsHtml}
      `;

      dialogContent.querySelector('#close-report-modal')?.addEventListener('click', () => dialog.close());
      dialogContent.querySelector('#btn-cancel-resolve')?.addEventListener('click', () => dialog.close());
      const intakeBtn = dialogContent.querySelector('#btn-intake-dispute');
      if (intakeBtn) {
        intakeBtn.addEventListener('click', async () => {
          intakeBtn.disabled = true;
          intakeBtn.textContent = 'Processing intake…';
          try {
            await staffService.intakeReport(detail.id);
            dialog.close();
            notice = { type: 'success', message: `Dispute #${detail.ticketCode} intake completed. Mediation room is now active.` };
            await loadData();
          } catch (err) {
            intakeBtn.disabled = false;
            intakeBtn.textContent = 'Intake Case';
            alert(err.message || 'Intake failed.');
          }
        });
      }

      const resolveForm = dialogContent.querySelector('#dispute-resolve-form');
      if (resolveForm) {
        const outcomeSelect = resolveForm.querySelector('#resolve-outcome');
        const menteeInput = resolveForm.querySelector('#resolve-mentee-refund');
        const errorEl = resolveForm.querySelector('#dispute-resolve-error');
        const total = Number(detail.disputedAmount || 0);

        const updateAmounts = () => {
          const outcome = outcomeSelect.value;
          const bankBox = resolveForm.querySelector('#resolve-bank-container');
          const refundRow = resolveForm.querySelector('#split-amounts-row');
          if (outcome === 'FULL_REFUND') {
            menteeInput.value = total;
            menteeInput.disabled = true;
            if (refundRow) refundRow.style.display = 'block';
            if (bankBox) bankBox.style.display = 'block';
          } else if (outcome === 'PARTIAL_REFUND') {
            menteeInput.disabled = false;
            if (refundRow) refundRow.style.display = 'block';
            if (bankBox) bankBox.style.display = 'block';
          } else {
            menteeInput.value = 0;
            menteeInput.disabled = true;
            if (refundRow) refundRow.style.display = 'none';
            if (bankBox) bankBox.style.display = 'none';
          }
        };

        outcomeSelect.addEventListener('change', updateAmounts);
        updateAmounts();

        resolveForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = resolveForm.querySelector('#btn-submit-resolve');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting decision...';
          if (errorEl) errorEl.classList.add('hidden');

          try {
            const resolutionType = outcomeSelect.value;
            const refundAmount = resolutionType === 'FULL_REFUND' ? total : (resolutionType === 'PARTIAL_REFUND' ? Number(menteeInput.value) : 0);
            const notes = resolveForm.querySelector('#resolve-notes').value.trim();
            const bankName = resolveForm.querySelector('#resolve-bank-name')?.value.trim() || detail.bankName || '';
            const accountNumber = resolveForm.querySelector('#resolve-account-number')?.value.trim() || detail.accountNumber || '';
            const accountName = resolveForm.querySelector('#resolve-account-name')?.value.trim() || detail.accountName || '';

            if ((resolutionType === 'FULL_REFUND' || resolutionType === 'PARTIAL_REFUND') && (!bankName || !accountNumber || !accountName)) {
              throw new Error('Please provide the mentee bank name, account number, and account holder name for Admin to execute the refund transfer.');
            }

            await staffService.resolveReport(detail.id, {
              resolutionType,
              resolutionNote: notes,
              refundAmount,
              bankName,
              accountNumber,
              accountName
            });

            dialog.close();
            notice = {
              type: 'success',
              message: (resolutionType === 'FULL_REFUND' || resolutionType === 'PARTIAL_REFUND')
                ? `Dispute #${detail.ticketCode} refund approved and forwarded to Admin for bank transfer.`
                : `Dispute #${detail.ticketCode} resolution finalized.`
            };
            await loadData();
          } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm & Submit Decision';
            if (errorEl) {
              errorEl.innerHTML = Notice({ message: err.message || 'Failed to submit resolution.', type: 'error' });
              errorEl.classList.remove('hidden');
            }
          }
        });
      }
    }
  }
  await loadData();
}
