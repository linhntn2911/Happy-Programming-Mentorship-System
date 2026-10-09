import { MentorAvatar } from './MentorAvatar.js';
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function DirectoryMentorCard(mentor) {
  const skills = (mentor.skills || []).map(skill => `
    <span class="directory-skill">${escapeHtml(skill)} <svg viewBox="0 0 24 24" aria-label="Verified skill"><path d="m8.5 12 2.2 2.2 4.8-5"/><circle cx="12" cy="12" r="9"/></svg></span>`).join('');
  const availability = mentor.acceptingMentees
    ? '<span class="availability-dot"></span> Available now'
    : '<span class="availability-dot is-waitlist"></span> Waitlist';

  return `
    <article class="directory-card" data-mentor-id="${escapeHtml(mentor.id)}" data-name="${escapeHtml(mentor.name)}">
      <div class="directory-card-media">
        ${MentorAvatar(mentor, 'directory-card-photo')}
        <span class="availability-badge">${availability}</span>
      </div>
      <div class="directory-card-body">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-brand">${escapeHtml(mentor.specialty)}</p>
            <h2 class="mt-1 font-display text-[26px] leading-tight">${escapeHtml(mentor.name)}</h2>
            <p class="mt-1 text-[13px] text-muted">${escapeHtml(mentor.role)} at <strong class="font-semibold text-ink">${escapeHtml(mentor.company)}</strong></p>
          </div>
          <button class="save-btn" data-save aria-label="Save ${escapeHtml(mentor.name)}" aria-pressed="false">
            <svg class="icon h-4 w-4" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span class="font-semibold text-ink">${mentor.reviewCount > 0 ? `★ ${Number(mentor.rating).toFixed(1)} <span class="font-normal text-muted">(${Number(mentor.reviewCount)} reviews)</span>` : '<span class="font-normal text-muted">No reviews yet</span>'}</span>
          <span class="text-muted">${mentor.yearsExperience} years of experience</span>
        </div>
        <p class="mt-4 text-[13px] leading-6 text-muted">${escapeHtml(mentor.description)}</p>
        <div class="mt-4 flex flex-wrap gap-2">${skills}</div>
        <div class="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p class="text-[11px] text-muted">Monthly mentorship from</p>
            <p class="mt-0.5 text-[17px] font-semibold">${escapeHtml(mentor.monthly)} VND <span class="text-[11px] font-normal text-muted">/ month</span></p>
          </div>
          <a class="btn btn-primary btn-sm" href="#/mentors/${encodeURIComponent(mentor.id)}">View profile</a>
        </div>
      </div>
    </article>`;
}
