const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function filterSavedMentors(mentors, { query = '', skill = '', sort = 'recent' } = {}) {
  const search = normalize(query);
  const filtered = mentors.filter(mentor => {
    const skills = mentor.skills || [];
    const matchesSkill = !skill || skills.includes(skill);
    const text = normalize([mentor.name, mentor.role, mentor.company, mentor.specialty, ...skills].join(' '));
    return matchesSkill && (!search || text.includes(search));
  });
  if (sort === 'name') return filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'price') return filtered.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  return filtered;
}
