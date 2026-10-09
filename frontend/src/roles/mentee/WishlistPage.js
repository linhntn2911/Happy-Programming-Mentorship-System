import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { DirectoryMentorCard } from '../../shared/DirectoryMentorCard.js';
import { wishlistService } from './wishlistService.js';
import { mentorService } from '../../shared/mentorService.js';
import { authService } from '../auth/authService.js';
import { renderUserDropdown, bindUserDropdown, renderNotificationBell } from '../../shared/Header.js';
import { filterSavedMentors } from './wishlistFilters.js';

const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const toDirectoryMentor = (mentor, index) => ({
  company: mentor.company || 'Technology company', languages: mentor.languages || ['English'], country: mentor.country || 'Vietnam',
  yearsExperience: mentor.yearsExperience || Number.parseInt(mentor.experience, 10) || 0,
  monthlyPrice: mentor.monthlyPrice || Number(String(mentor.monthly || 0).replaceAll(',', '')),
  rating: mentor.rating || 0, reviewCount: mentor.reviewCount || 0, acceptingMentees: mentor.acceptingMentees !== false, ...mentor, index
});

export async function mountWishlist(root) {
  const user = authService.getCurrentUser();
  if (!user) { root.innerHTML = '<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><h1 class="font-display text-4xl">Your wishlist</h1><p class="mx-auto mt-4 max-w-md text-muted">Log in to save mentors and access your wishlist from any device.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>'; return; }
  const name = user.name || user.email || 'Account';
  const initials = name.trim().split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="font-semibold text-brand">{h} HappyProgramming</a><nav class="flex items-center gap-3">${BrowseAllMentorsLink()}${renderNotificationBell()}${renderUserDropdown({ currentUser:user, displayName:name, initials })}</nav></div></header><main class="min-h-screen bg-cream"><section class="container py-12 sm:py-16"><p class="eyebrow">YOUR SHORTLIST</p><h1 class="mt-3 font-display text-4xl sm:text-5xl">Saved mentors</h1><p class="mt-4 max-w-2xl text-sm leading-7 text-muted">Keep the mentors you want to compare before sending an application.</p><div id="wishlist-state" class="mt-10" role="status">Loading your wishlist…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const state = root.querySelector('#wishlist-state');
  try {
    const slugs = await wishlistService.list();
    if (root.querySelector('#wishlist-state') !== state) return;
    if (!slugs.length) {
      state.innerHTML = '<div class="directory-message text-center"><span class="empty-icon">☆</span><h2>No saved mentors yet</h2><p>Save a mentor from the directory or a profile to see them here.</p><a href="?#/mentors" data-browse-all-mentors class="btn btn-primary btn-sm mt-5">Browse all mentors</a></div>';
      return;
    }
    const mentors = await mentorService.getFeaturedMentors();
    if (root.querySelector('#wishlist-state') !== state) return;
    const byId = new Map(mentors.map((mentor, index) => [String(mentor.id), toDirectoryMentor(mentor, index)]));
    const savedMentors = slugs.map(slug => byId.get(String(slug))).filter(Boolean);
    if (!savedMentors.length) {
      state.innerHTML = '<div class="directory-message text-center"><h2>Saved mentors are temporarily unavailable</h2><p>Please try again shortly.</p><button id="wishlist-retry" class="btn btn-outline btn-sm mt-5">Try again</button></div>';
      root.querySelector('#wishlist-retry')?.addEventListener('click', () => mountWishlist(root));
      return;
    }
    const skills = [...new Set(savedMentors.flatMap(mentor => mentor.skills || []))].sort((a, b) => a.localeCompare(b));
    state.innerHTML = `
      <div class="mb-5 text-sm text-muted" id="wishlist-count"></div>
      <div class="mb-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,180px)]">
        <div><label class="mb-1.5 block text-xs font-semibold" for="wishlist-search">Search saved mentors</label><input id="wishlist-search" type="search" placeholder="Name, role, company or skill" class="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"></div>
        <div><label class="mb-1.5 block text-xs font-semibold" for="wishlist-skill">Skill</label><select id="wishlist-skill" class="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="">All skills</option>${skills.map(skill => `<option value="${esc(skill)}">${esc(skill)}</option>`).join('')}</select></div>
        <div><label class="mb-1.5 block text-xs font-semibold" for="wishlist-sort">Sort by</label><select id="wishlist-sort" class="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"><option value="recent">Recently saved</option><option value="name">Name A–Z</option><option value="price">Lowest monthly price</option></select></div>
      </div>
      <div id="wishlist-results" class="space-y-5"></div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;
    const search = state.querySelector('#wishlist-search');
    const skill = state.querySelector('#wishlist-skill');
    const sort = state.querySelector('#wishlist-sort');
    const results = state.querySelector('#wishlist-results');
    const count = state.querySelector('#wishlist-count');
    const renderResults = () => {
      const visible = filterSavedMentors(savedMentors, { query: search.value, skill: skill.value, sort: sort.value });
      count.textContent = `${visible.length} of ${savedMentors.length} saved mentor${savedMentors.length === 1 ? '' : 's'}`;
      results.innerHTML = visible.length ? visible.map(DirectoryMentorCard).join('') : '<div class="directory-message"><h2>No matching mentors</h2><p>Try another name or skill.</p><button type="button" id="wishlist-clear-filters" class="btn btn-outline btn-sm mt-5">Clear filters</button></div>';
      results.querySelectorAll('[data-save]').forEach(button => {
        const card = button.closest('[data-mentor-id]');
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('aria-label', `Remove ${card?.dataset.name || 'mentor'} from wishlist`);
      });
    };
    [search, skill, sort].forEach(control => control.addEventListener(control === search ? 'input' : 'change', renderResults));
    results.addEventListener('click', async event => {
      if (event.target.closest('#wishlist-clear-filters')) { search.value = ''; skill.value = ''; sort.value = 'recent'; renderResults(); return; }
      const button = event.target.closest('[data-save]');
      if (!button) return;
      const slug = button.closest('[data-mentor-id]')?.dataset.mentorId;
      if (!slug) return;
      button.disabled = true;
      try {
        await wishlistService.remove(slug);
        const index = savedMentors.findIndex(mentor => String(mentor.id) === slug);
        if (index >= 0) savedMentors.splice(index, 1);
        if (!savedMentors.length) state.innerHTML = '<div class="directory-message text-center"><span class="empty-icon">☆</span><h2>No saved mentors yet</h2><p>Save a mentor from the directory or a profile to see them here.</p><a href="?#/mentors" data-browse-all-mentors class="btn btn-primary btn-sm mt-5">Browse all mentors</a></div>';
        else renderResults();
      } catch (error) {
        const toast = state.querySelector('#toast');
        if (toast) { toast.textContent = error.message || 'Unable to update your wishlist.'; toast.hidden = false; }
        button.disabled = false;
      }
    });
    renderResults();
  } catch (error) {
    state.innerHTML = `<div class="directory-message text-center"><h2>We could not load your wishlist</h2><p>${esc(error.message || 'Please try again.')}</p><button id="wishlist-retry" class="btn btn-outline btn-sm mt-5">Try again</button></div>`;
    root.querySelector('#wishlist-retry')?.addEventListener('click', () => mountWishlist(root));
  }
}
