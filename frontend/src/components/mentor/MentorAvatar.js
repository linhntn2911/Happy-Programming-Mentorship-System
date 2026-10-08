import { escapeHtml as e } from '../../utils/html.js';

const samplePortraits = {
  'minh-an': 'mentor-1.jpg',
  'thao-linh': 'mentor-2.jpg',
  'hoang-nam': 'mentor-3.jpg',
  'david-pham': 'mentor-4.jpg',
  'sofia-tran': 'mentor-5.jpg',
  'alex-nguyen': 'mentor-6.jpg',
};

export function MentorAvatar(mentor, className = '', size = 176) {
  const parts = String(mentor.name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() : 'M';
  const portrait = String(mentor.portrait || samplePortraits[mentor.id] || '');
  const src = portrait.startsWith('/api/mentors/') ? portrait : /^mentor-[1-6]\.jpg$/.test(portrait) ? `/images/${portrait}` : '';
  return `<span class="${className} relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-lilac text-brand" style="width:${size}px;height:${size}px" role="img" aria-label="${e(mentor.name)}"><span class="text-3xl font-semibold">${e(initials)}</span>${src ? `<img src="${e(src)}" alt="" width="${size}" height="${size}" class="absolute inset-0 h-full w-full object-cover">` : ''}</span>`;
}
