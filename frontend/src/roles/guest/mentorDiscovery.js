// Shared homepage topics, directory labels, and category membership.
export const MENTOR_CATEGORIES = [
  { label: 'Java & Spring Boot', skills: ['Java', 'Spring Boot'] },
  { label: 'Frontend Development', specialties: ['Frontend'], skills: ['React', 'TypeScript', 'Tailwind CSS'] },
  { label: 'Python & Data', specialties: ['AI & Data'], skills: ['Python', 'Machine Learning'] },
  { label: 'System Design', skills: ['System Design'] },
  { label: 'Full-stack Development', specialties: ['Full-stack'] }
];

export function mentorMatchesCategory(mentor, label) {
  const category = MENTOR_CATEGORIES.find(item => item.label === label);
  if (!category) return false;
  return (category.specialties || []).includes(mentor.specialty)
    || (mentor.skills || []).some(skill => (category.skills || []).includes(skill));
}

export function mentorSkillOptions(mentors) {
  const counts = new Map();
  mentors.forEach(mentor => new Set(mentor.skills || []).forEach(skill => {
    if (skill) counts.set(skill, (counts.get(skill) || 0) + 1);
  }));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
