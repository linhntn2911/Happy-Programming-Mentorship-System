import { StaffLayout } from './StaffLayout.js';
import { escapeHtml as e } from '../../shared/html.js';
import { StatusBadge } from '../admin/AdminPrimitives.js';

export function StaffSkillsPage(skills = [], categories = [], currentUser = null) {
  const totalSkills = skills.length;
  const activeSkills = skills.filter(s => s.active).length;
  const categoryCount = categories.length || new Set(skills.map(s => s.category)).size;

  const content = `
    <div class="admin-page-heading flex items-center justify-between gap-4">
      <div>
        <p class="eyebrow">STAFF WORKSPACE</p>
        <h1>Technical skills management</h1>
        <p class="text-xs text-muted mt-1">Maintain platform programming skills dictionary, toggle active discovery states, and configure skill categories.</p>
      </div>
      <button type="button" id="btn-open-add-skill" class="btn btn-primary shrink-0 flex items-center gap-1.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add new skill</span>
      </button>
    </div>

    <!-- Summary Metrics -->
    <div class="admin-stats grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <div class="stat-label">
          <span>Total Skills</span>
          <svg class="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg>
        </div>
        <div class="stat-value mt-1">${totalSkills}</div>
        <div class="stat-note">Configured tech stack items</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          <span>Active Skills</span>
          <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-value mt-1 text-emerald-700">${activeSkills}</div>
        <div class="stat-note">Visible in mentor discovery</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">
          <span>Categories</span>
          <svg class="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </div>
        <div class="stat-value mt-1">${categoryCount}</div>
        <div class="stat-note">Skill domains (Backend, Frontend, etc.)</div>
      </div>
    </div>

    <section class="admin-panel">
      <div class="admin-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-line">
        <div class="admin-search flex-1 min-w-[240px]">
          <input type="search" id="skill-search-input" placeholder="Search skill by name or slug..." class="admin-field !mb-0 w-full" aria-label="Search skills">
        </div>
        <div class="flex items-center gap-3">
          <label class="admin-field !mb-0 text-xs flex items-center gap-2">
            Category:
            <select id="skill-category-filter" class="text-xs py-1 px-2.5 rounded-lg border border-line bg-white">
              <option value="ALL">All Categories</option>
              ${categories.map(c => `<option value="${e(c.id)}">${e(c.name)}</option>`).join('')}
            </select>
          </label>
          <label class="admin-field !mb-0 text-xs flex items-center gap-2">
            Status:
            <select id="skill-status-filter" class="text-xs py-1 px-2.5 rounded-lg border border-line bg-white">
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
      </div>

      <div id="skills-table-container">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- Modal Form: Add / Edit Skill -->
    <dialog id="skill-form-dialog" class="modal" aria-labelledby="skill-modal-title">
      <div id="skill-modal-content" class="w-full max-w-lg p-6 bg-white rounded-2xl border border-line shadow-2xl">
        <button class="modal-close" id="close-skill-modal" type="button" aria-label="Close">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M6 18 18 6"/></svg>
        </button>
        <p class="eyebrow !pr-8">TECHNICAL SKILL CATALOG</p>
        <h2 id="skill-modal-title" class="mt-2 font-display text-2xl text-ink">Add new skill</h2>
        <p class="text-xs text-muted mt-1">Configure technical skill metadata for mentor registration and public search filters.</p>

        <form id="skill-modal-form" class="mt-5 space-y-4">
          <input type="hidden" id="skill-edit-id" value="">

          <label class="admin-field" for="skill-name-input">
            Skill Name <span class="text-rose-600">*</span>
            <input type="text" id="skill-name-input" required placeholder="e.g. TypeScript, GraphQL, Docker" maxlength="100" class="w-full mt-1">
          </label>

          <label class="admin-field" for="skill-category-input">
            Domain Category <span class="text-rose-600">*</span>
            <select id="skill-category-input" required class="w-full mt-1 p-2 border border-line rounded-lg bg-white text-xs">
              <option value="">Select a category...</option>
              ${categories.map(c => `<option value="${e(c.id)}">${e(c.name)}</option>`).join('')}
            </select>
          </label>

          <label class="admin-field" for="skill-description-input">
            Description / Overview (Optional)
            <textarea id="skill-description-input" rows="3" placeholder="Brief description of technology stack or domain applicability..." maxlength="500" class="w-full mt-1 text-xs"></textarea>
          </label>

          <div class="flex items-center gap-2 pt-1">
            <input type="checkbox" id="skill-active-input" checked class="h-4 w-4 rounded border-line text-brand focus:ring-brand">
            <label for="skill-active-input" class="text-xs font-semibold text-ink cursor-pointer">Active for mentor discovery and profile selection</label>
          </div>

          <p id="skill-form-error" class="text-xs text-rose-600 font-semibold hidden" role="alert"></p>

          <div class="admin-actions mt-6 pt-4 border-t border-line flex justify-end gap-3">
            <button type="button" id="btn-cancel-skill" class="btn btn-outline">Cancel</button>
            <button type="submit" id="btn-save-skill" class="btn btn-primary">Save skill</button>
          </div>
        </form>
      </div>
    </dialog>
  `;

  return StaffLayout('skills', content, currentUser);
}
