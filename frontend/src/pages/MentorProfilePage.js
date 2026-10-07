import { mentorService } from '../services/mentorService.js';
import { Footer } from '../components/layout/Footer.js';
import { MentorPricingCard, bindMentorPricingCardEvents } from '../components/mentor/MentorPricingCard.js';
import { wishlistService } from '../services/wishlistService.js';
import { authService } from '../services/authService.js';
import { bindUserDropdown, getInitials, renderUserDropdown } from '../components/layout/Header.js';
const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const profileHeader = () => {
  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.email || '';
  return `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="flex shrink-0 items-center gap-2.5" aria-label="HappyProgramming home"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span><span class="text-[16px] font-semibold tracking-tight text-ink">Happy<span class="text-brand">Programming</span></span></a><nav class="flex items-center gap-6" aria-label="Main navigation"><a href="#/mentors" class="nav-link text-brand">Find a mentor</a>${user ? renderUserDropdown({ currentUser: user, displayName, initials: getInitials(displayName) }) : '<a href="#/login" class="btn btn-outline btn-sm">Log in</a>'}</nav></div></header>`;
};
const layout = body => `${profileHeader()}<main class="profile-page"><div class="container py-8 sm:py-12">${body}</div></main>${Footer()}`;
export function ProfilePage(m) {
  return layout(`<nav class="mb-8 text-xs text-muted" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="#/mentors">Find a mentor</a> / <span aria-current="page">${esc(m.name)}</span></nav>
    <div class="profile-columns"><div class="min-w-0">
      <section class="profile-intro"><img class="profile-photo" src="/images/${esc(m.portrait)}" alt="${esc(m.name)}" width="168" height="184"><div><p class="eyebrow">PROGRAMMING MENTOR</p><h1 class="mt-3 font-display text-4xl sm:text-5xl">${esc(m.name)}</h1><p class="mt-3 text-base">${esc(m.role)}${m.company ? ` at <strong>${esc(m.company)}</strong>` : ''}</p><div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span>${esc(m.country)}</span><span>${esc(m.experience)}</span></div><p class="mt-4 text-sm text-brand">${m.acceptingMentees ? 'Accepting new mentees' : 'Not accepting new mentees'}</p><button type="button" class="save-btn profile-save-btn mt-5" data-profile-save data-mentor-id="${esc(m.id)}" aria-pressed="false" aria-label="Save ${esc(m.name)} to wishlist"><svg class="icon h-4 w-4" viewBox="0 0 24 24"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>Save to wishlist</span></button></div></section>
      <nav class="profile-nav" aria-label="Profile sections"><a href="#profile-about">About</a><a href="#profile-experience">Experience</a><a href="#profile-skills">Skills</a><a href="#profile-reviews">Reviews</a></nav>
      <section class="profile-block" id="profile-about"><p class="eyebrow">MEET YOUR MENTOR</p><h2 class="mt-2">About ${esc(m.name)}</h2><p class="profile-copy">${esc(m.description)}</p></section>
      <section class="profile-block" id="profile-experience"><h2>Experience</h2><div class="profile-experience"><span class="profile-monogram" aria-hidden="true">${esc(m.initials)}</span><div><h3 class="font-semibold">${esc(m.role)}</h3><p class="mt-1 text-sm text-muted">${esc(m.company)}</p><p class="mt-2 text-sm text-brand">${esc(m.experience)}</p></div></div>${m.languages?.length ? `<p class="mt-5 text-sm text-muted">Languages: ${m.languages.map(esc).join(', ')}</p>` : ''}</section>
      <section class="profile-block" id="profile-skills"><h2>Skills</h2><div class="mt-5 flex flex-wrap gap-2">${(m.skills || []).map(s => `<a class="directory-skill" href="?${esc(new URLSearchParams({skills:s}).toString())}#/mentors">${esc(s)}</a>`).join('') || '<p class="text-sm text-muted">No skills shared yet.</p>'}</div></section>
      <section class="profile-block" id="profile-reviews"><h2>What mentees say</h2><div class="profile-empty"><span aria-hidden="true">☆</span><h3 class="font-semibold">Reviews are not available yet</h3><p class="mt-2 text-sm text-muted">Moderated learner reviews will appear here when available.</p></div></section>
    </div><aside class="profile-sidebar" aria-label="Mentorship services">
      ${MentorPricingCard({
        mentorName: m.name,
        mentorSlug: m.id,
        oneOffPrice: m.session || "500,000",
        currencyMode: "VND",
        onApplyClick: `window.location.hash = '#/apply/monthly?mentor=${encodeURIComponent(m.id)}&name=${encodeURIComponent(m.name)}'`
      })}
      <div class="profile-note mt-6"><h3 class="text-sm font-semibold">A thoughtful match comes first</h3><p class="mt-2 text-xs leading-6 text-muted">Monthly mentorship follows mentor approval before payment.</p></div>
    </aside></div>`);
}
export function ServiceDetail(m, type) {
  const monthly = type === 'MONTHLY';
  const price = monthly ? m.monthly : m.session;
  return `<p class="text-xs font-semibold uppercase tracking-wider text-muted">${monthly ? 'Monthly mentorship' : 'One-off session'}</p><p class="profile-price">${esc(price || 'Not available')} ${price ? '<span>VND</span>' : ''}</p><p class="text-xs text-muted">${monthly ? 'per month' : 'per session'}</p><div class="profile-service-description"><h3 class="font-semibold">${monthly ? 'Ongoing guidance' : 'A focused conversation'}</h3><p class="mt-2 text-sm leading-7 text-muted">${monthly ? 'Explore monthly support for your programming and learning goals.' : 'Explore individual guidance on a specific programming topic.'}</p></div>`;
}
export async function mountMentorProfile(app, id) {
  const state = (title, copy, retry=false) => layout(`<section class="profile-block text-center" role="status"><h1 class="font-display text-3xl">${title}</h1><p class="mt-4 text-muted">${copy}</p>${retry ? '<button id="profile-retry" class="btn btn-primary mt-6">Try again</button>' : '<a href="#/mentors" class="btn btn-outline mt-6">Browse mentors</a>'}</section>`);
  app.innerHTML = state('Loading mentor profile…','Getting the profile details.');
  const marker = app.firstElementChild;
  try {
    const m = await mentorService.getProfile(id);
    if (app.firstElementChild !== marker) return;
    if (!m) { app.innerHTML = state('Mentor not found','This profile is not available.'); return; }
    app.innerHTML = ProfilePage(m);
    bindMentorPricingCardEvents(app);
    bindUserDropdown(app, () => { location.hash = '#/'; location.reload(); });
    const saveButton = app.querySelector('[data-profile-save]');
    if (saveButton) {
      try { saveButton.setAttribute('aria-pressed', String((await wishlistService.list()).includes(String(m.id)))); } catch { /* guest or unavailable API */ }
      saveButton.addEventListener('click', async () => {
        if (!authService.getCurrentUser()) { location.hash = '#/login'; return; }
        const saved = saveButton.getAttribute('aria-pressed') === 'true';
        saveButton.disabled = true;
        try {
          if (saved) await wishlistService.remove(m.id); else await wishlistService.save(m.id);
          saveButton.setAttribute('aria-pressed', String(!saved));
          saveButton.querySelector('span').textContent = saved ? 'Save to wishlist' : 'Saved to wishlist';
        } catch (error) { saveButton.querySelector('span').textContent = error.message || 'Unable to update wishlist'; }
        finally { saveButton.disabled = false; }
      });
    }
    app.querySelectorAll('.profile-nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); app.querySelector(a.getAttribute('href')).scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }));
  } catch {
    if (app.firstElementChild !== marker) return;
    app.innerHTML = state('Unable to load this profile','Please check your connection and try again.',true);
    app.querySelector('#profile-retry').addEventListener('click',() => mountMentorProfile(app,id));
  }
}
