import { Footer } from '../components/layout/Footer.js';
import { BrowseAllMentorsLink } from '../components/ui/BrowseAllMentorsLink.js';
import { authService } from '../services/authService.js';
import { bindUserDropdown, getInitials, renderUserDropdown, renderNotificationBell } from '../components/layout/Header.js';

const mentorSections = [
  { id: 'availability', label: 'Availability schedule', href: '#/mentor/availability' },
  { id: 'packages', label: 'Mentorship packages', href: '#/mentor/packages' },
];

function mentorWorkspaceHeader() {
  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.email || '';
  const accountNavigation = user
    ? `<div class="flex items-center gap-3">${renderNotificationBell()}${renderUserDropdown({ currentUser: user, displayName, initials: getInitials(displayName) })}</div>`
    : '<a href="#/login" class="btn btn-outline btn-sm">Log in</a>';

  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span><span class="text-[16px] font-semibold tracking-tight text-ink">Happy<span class="text-brand">Programming</span></span></a><nav class="flex items-center gap-6" aria-label="Main navigation">${BrowseAllMentorsLink()}${accountNavigation}</nav></div></header>`;
}

function sectionContent(section) {
  if (section === 'availability') {
    return {
      eyebrow: 'SCHEDULE MANAGEMENT',
      title: 'Availability schedule',
      description: 'Plan when mentees can request sessions with you.',
      notice: 'Availability scheduling is not available yet. No schedule has been created or changed.',
      details: 'Recurring availability, timezone handling, and date exceptions will be added in a future release.',
    };
  }

  return {
    eyebrow: 'SERVICE MANAGEMENT',
    title: 'Mentorship packages',
    description: 'Review the services and packages you offer to mentees.',
    notice: 'Package management is not available yet. No package has been created or changed.',
    details: 'Create and update offering details and prices when package management is released.',
  };
}

export function MentorWorkspacePage(section) {
  const activeSection = mentorSections.some(item => item.id === section) ? section : 'availability';
  const content = sectionContent(activeSection);
  const navigation = mentorSections.map(item => `
    <a href="${item.href}" class="block rounded-xl px-4 py-3 text-sm font-semibold ${item.id === activeSection ? 'bg-lilac text-brand' : 'text-ink hover:bg-cream'}"
       ${item.id === activeSection ? 'aria-current="page"' : ''}>${item.label}</a>
  `).join('');

  return `${mentorWorkspaceHeader()}
    <main class="min-h-screen bg-cream">
      <div class="container max-w-6xl py-12">
        <p class="eyebrow">MENTOR SPACE</p>
        <h1 class="mt-3 font-display text-4xl text-ink">${content.title}</h1>
        <p class="mt-3 text-sm text-muted">${content.description}</p>
        <div class="mt-8 grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav class="rounded-2xl border border-line bg-white p-3 shadow-sm" aria-label="Mentor workspace">
            <a href="#/mentor/dashboard" class="mb-1 block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-cream">Dashboard</a>
            <a href="#/mentor/profile" class="mb-1 block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-cream">My profile</a>
            ${navigation}
          </nav>
          <section class="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="mentor-module-title">
            <p class="eyebrow">${content.eyebrow}</p>
            <h2 id="mentor-module-title" class="mt-2 text-xl font-semibold text-ink">${content.title}</h2>
            <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
              <p class="font-semibold">${content.notice}</p>
              <p class="mt-2">${content.details}</p>
            </div>
            <a href="#/mentor/dashboard" class="btn btn-outline mt-6">Back to mentor dashboard</a>
          </section>
        </div>
      </div>
    </main>${Footer()}`;
}

export function mountMentorWorkspacePage(root, section) {
  document.title = `${section === 'packages' ? 'Mentorship packages' : 'Availability schedule'} | HappyProgramming`;
  root.innerHTML = MentorWorkspacePage(section);
  bindUserDropdown(root);
}
