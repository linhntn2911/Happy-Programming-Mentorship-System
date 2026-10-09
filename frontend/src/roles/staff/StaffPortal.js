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
import { StaffAccessDeniedPage } from './StaffAccessDeniedPage.js';
import { staffService } from './staffService.js';
import { authService } from '../auth/authService.js';
import { escapeHtml as e } from '../../shared/html.js';
import { StatusBadge } from '../admin/AdminPrimitives.js';

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
