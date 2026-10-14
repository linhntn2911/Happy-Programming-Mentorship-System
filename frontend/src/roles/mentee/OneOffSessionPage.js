import { BrandLogo } from '../../shared/BrandLogo.js';
import { Footer } from '../../shared/Footer.js';
import { MentorAvatar } from '../../shared/MentorAvatar.js';
import { mentorService } from '../../shared/mentorService.js';
import { authService } from '../auth/authService.js';
import { mentorPlanService } from '../mentor/mentorPlanService.js';
import { bindUserDropdown, getInitials, renderUserDropdown } from '../../shared/Header.js';

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const money = (value, currency = 'VND') => `${Number(value || 0).toLocaleString('en-US')} ${currency}`;

function header() {
  const user = authService.getCurrentUser();
  const name = user?.name || user?.email || '';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4">${BrandLogo()}<nav class="flex items-center gap-5" aria-label="Main navigation"><a class="text-sm font-semibold text-ink hover:text-brand" href="?#/mentors">Browse mentors</a>${user ? renderUserDropdown({ currentUser: user, displayName: name, initials: getInitials(name) }) : '<a class="btn btn-outline btn-sm" href="#/login">Log in</a>'}</nav></div></header>`;
}

const shell = body => `${header()}<main class="bg-cream"><div class="container py-10 sm:py-14">${body}</div></main>${Footer()}`;

export function oneOffSessionList(mentor, offerings) {
  return shell(`
    <nav class="mb-7 text-xs text-muted" aria-label="Breadcrumb"><a href="?#/mentors">Mentors</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a> / <span aria-current="page">One-off sessions</span></nav>
    <div class="mx-auto max-w-5xl">
      <p class="eyebrow">ONE-OFF SESSIONS</p>
      <h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">Book a focused session with ${esc(mentor.name)}</h1>
      <p class="mt-4 max-w-3xl text-sm leading-7 text-muted">Choose a published session for a specific programming question, code review or career discussion.</p>
      ${offerings.length ? `<div class="mt-9 grid gap-5 md:grid-cols-2">${offerings.map(item => `
        <article class="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">${esc(item.sessionDurationMinutes)} minutes</p>
          <h2 class="mt-2 font-display text-2xl text-ink">${esc(item.name)}</h2>
          <p class="mt-3 line-clamp-3 text-sm leading-6 text-muted">${esc(item.description)}</p>
          <div class="mt-6 flex items-center justify-between gap-4"><strong class="text-lg text-ink">${money(item.price, item.currency)}</strong><a class="btn btn-primary btn-sm" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions?offeringId=${encodeURIComponent(item.id)}">View details</a></div>
        </article>`).join('')}</div>` : `<section class="mt-9 rounded-2xl border border-line bg-white p-8 text-center"><h2 class="font-display text-2xl text-ink">No one-off sessions published</h2><p class="mt-3 text-sm text-muted">This mentor does not currently offer individual sessions.</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentor.id)}">Back to mentor profile</a></section>`}
    </div>`);
}

export function oneOffSessionDetail(mentor, offering) {
  const rating = Number(mentor.rating || 0);
  const reviewCount = Number(mentor.reviewCount || 0);
  return shell(`
    <nav class="mb-7 text-xs text-muted" aria-label="Breadcrumb"><a href="?#/mentors">Mentors</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a> / <a href="#/mentors/${encodeURIComponent(mentor.id)}/sessions">One-off sessions</a> / <span aria-current="page">${esc(offering.name)}</span></nav>
    <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <p class="eyebrow">ONE-OFF SESSION</p><h1 class="mt-3 font-display text-4xl text-ink sm:text-5xl">${esc(offering.name)}</h1>
        <p class="mt-3 text-sm text-muted">with <a class="font-semibold text-brand" href="#/mentors/${encodeURIComponent(mentor.id)}">${esc(mentor.name)}</a></p>
        <div class="mt-5 flex flex-wrap gap-4 text-sm text-muted"><span>${esc(offering.sessionDurationMinutes)} minutes</span>${reviewCount ? `<span>${rating.toFixed(1)} from ${reviewCount} verified review${reviewCount === 1 ? '' : 's'}</span>` : ''}</div>
        <section class="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">About this session</h2><p class="mt-4 whitespace-pre-line text-sm leading-7 text-muted">${esc(offering.description)}</p></section>
        <section class="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8"><h2 class="font-display text-2xl text-ink">Your mentor</h2><div class="mt-5 flex items-start gap-4">${MentorAvatar(mentor, 'h-16 w-16 rounded-full object-cover', 64)}<div><h3 class="font-semibold text-ink">${esc(mentor.name)}</h3><p class="mt-1 text-sm text-muted">${esc(mentor.role)}${mentor.company ? ` at ${esc(mentor.company)}` : ''}</p><p class="mt-3 text-sm leading-6 text-muted">${esc(mentor.description)}</p></div></div></section>
      </div>
      <aside class="sticky top-5 rounded-2xl border border-line bg-white p-6 shadow-sm" aria-label="Session booking summary">
        <p class="text-xs font-semibold uppercase tracking-wider text-brand">SESSION SUMMARY</p><h2 class="mt-2 text-xl font-semibold text-ink">${esc(offering.name)}</h2>
        <dl class="mt-5 space-y-3 border-y border-line py-4 text-sm"><div class="flex justify-between gap-4"><dt class="text-muted">Duration</dt><dd class="font-semibold text-ink">${esc(offering.sessionDurationMinutes)} minutes</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">Price</dt><dd class="font-semibold text-ink">${money(offering.price, offering.currency)}</dd></div></dl>
        <label class="mt-5 block text-xs font-semibold text-ink" for="session-agenda">Discussion agenda</label><textarea id="session-agenda" class="mt-2 w-full resize-y rounded-xl border border-line px-3 py-3 text-sm focus:border-brand focus:outline-none" rows="4" maxlength="4000" placeholder="What would you like help with?"></textarea>
        <div class="mt-5 rounded-xl bg-lilac p-4 text-sm text-muted" role="status"><strong class="text-ink">No available times published yet.</strong><p class="mt-1">Booking will open after this mentor configures an availability schedule.</p></div>
        <button class="btn btn-primary mt-5 w-full" type="button" disabled aria-disabled="true">Choose a time</button>
        <a class="btn btn-outline mt-3 w-full" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions">View all sessions</a>
      </aside>
    </div>`);
}

export async function mountOneOffSessionPage(root, mentorId, offeringId = '') {
  root.innerHTML = shell('<section class="rounded-2xl border border-line bg-white p-8 text-center" role="status">Loading one-off sessions…</section>');
  const marker = root.firstElementChild;
  try {
    const [mentor, offerings] = await Promise.all([mentorService.getProfile(mentorId), mentorPlanService.getMentorOfferings(mentorId)]);
    if (root.firstElementChild !== marker) return;
    if (!mentor) throw new Error('Mentor not found.');
    const oneOff = offerings.filter(item => item.serviceType === 'ONE_OFF' && item.status === 'ACTIVE');
    const selected = offeringId ? oneOff.find(item => String(item.id) === String(offeringId)) : null;
    root.innerHTML = offeringId && !selected
      ? shell(`<section class="rounded-2xl border border-line bg-white p-8 text-center"><h1 class="font-display text-3xl text-ink">Session unavailable</h1><p class="mt-3 text-muted">This offering is no longer active.</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentor.id)}/sessions">View active sessions</a></section>`)
      : selected ? oneOffSessionDetail(mentor, selected) : oneOffSessionList(mentor, oneOff);
    bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  } catch (error) {
    if (root.firstElementChild !== marker) return;
    root.innerHTML = shell(`<section class="rounded-2xl border border-line bg-white p-8 text-center" role="alert"><h1 class="font-display text-3xl text-ink">Unable to load sessions</h1><p class="mt-3 text-muted">${esc(error.message || 'Please try again later.')}</p><a class="btn btn-outline mt-6" href="#/mentors/${encodeURIComponent(mentorId)}">Back to mentor profile</a></section>`);
  }
}
