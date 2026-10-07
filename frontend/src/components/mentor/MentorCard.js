export function MentorCard(mentor) {
  const skillsHtml = mentor.skills
    ? mentor.skills.map(s => `<span class="tag">${s}</span>`).join('')
    : '';

  return `
<article class="mentor-card" data-id="${mentor.id}" data-name="${mentor.name}" data-skills="${(mentor.skills || []).join(', ')}" data-specialty="${mentor.specialty}" data-role="${mentor.role}">
  <div class="flex items-start gap-4">
    <img src="/images/${mentor.portrait}" alt="${mentor.name}" width="56" height="56" class="h-14 w-14 rounded-full object-cover bg-lilac">
    <div class="min-w-0 flex-1">
      <h3 class="font-display text-lg font-semibold truncate">${mentor.name}</h3>
      <p class="text-[11px] text-muted truncate">${mentor.role}</p>
      <p class="text-[10px] text-brand/80">${mentor.experience}</p>
    </div>
    <button class="save-btn shrink-0" data-save aria-label="Save mentor" aria-pressed="false">
      <svg class="icon w-4 h-4" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
  </div>
  <p class="mt-4 text-[12px] leading-6 text-muted line-clamp-2">${mentor.description}</p>
  <div class="mt-4 flex flex-wrap gap-1.5">${skillsHtml}</div>
  <div class="mt-auto border-t border-line pt-4 flex items-center justify-between text-[11px]">
    <div>
      <span class="text-muted">Monthly</span>
      <p class="font-semibold text-ink">${mentor.monthly} VND</p>
    </div>
    <div class="text-right">
      <span class="text-muted">1-off session</span>
      <p class="font-semibold text-ink">${mentor.session} VND</p>
    </div>
  </div>
<a class="btn btn-outline btn-sm mt-4" href="#/mentors/${encodeURIComponent(mentor.id)}">View profile</a>
</article>
  `;
}
