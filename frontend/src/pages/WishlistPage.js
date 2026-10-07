import { BrowseAllMentorsLink } from '../components/ui/BrowseAllMentorsLink.js';
import { DirectoryMentorCard } from '../components/mentor/DirectoryMentorCard.js';
import { wishlistService } from '../services/wishlistService.js';
import { authService } from '../services/authService.js';
import { renderUserDropdown, bindUserDropdown } from '../components/layout/Header.js';

const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const toDirectoryMentor = (mentor, index) => ({
  company: mentor.company || 'Technology company', languages: mentor.languages || ['English'], country: mentor.country || 'Vietnam',
  yearsExperience: mentor.yearsExperience || Number.parseInt(mentor.experience, 10) || 0,
  monthlyPrice: mentor.monthlyPrice || Number(String(mentor.monthly || 0).replaceAll(',', '')),
  rating: mentor.rating || 0, reviewCount: mentor.reviewCount || 0, acceptingMentees: mentor.acceptingMentees !== false, ...mentor, index
});

export async function mountWishlist(root, mentors = []) {
  const user = authService.getCurrentUser();
  if (!user) { root.innerHTML = '<main class="min-h-screen bg-cream"><div class="container py-24 text-center"><h1 class="font-display text-4xl">Your wishlist</h1><p class="mx-auto mt-4 max-w-md text-muted">Log in to save mentors and access your wishlist from any device.</p><a href="#/login" class="btn btn-primary mt-7">Log in</a></div></main>'; return; }
  const name = user.name || user.email || 'Account';
  const initials = name.trim().split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();
  root.innerHTML = `<header class="directory-header"><div class="container flex h-[76px] items-center justify-between gap-4"><a href="#/" class="font-semibold text-brand">{h} HappyProgramming</a><nav class="flex items-center gap-3">${BrowseAllMentorsLink()}${renderUserDropdown({ currentUser:user, displayName:name, initials })}</nav></div></header><main class="min-h-screen bg-cream"><section class="container py-12 sm:py-16"><p class="eyebrow">YOUR SHORTLIST</p><h1 class="mt-3 font-display text-4xl sm:text-5xl">Saved mentors</h1><p class="mt-4 max-w-2xl text-sm leading-7 text-muted">Keep the mentors you want to compare before sending an application.</p><div id="wishlist-state" class="mt-10" role="status">Loading your wishlist…</div></section></main>`;
  bindUserDropdown(root, () => { location.hash = '#/'; location.reload(); });
  const state = root.querySelector('#wishlist-state');
  try {
    const slugs = await wishlistService.list();
    const byId = new Map(mentors.map((mentor, index) => [String(mentor.id), toDirectoryMentor(mentor, index)]));
    const savedMentors = slugs.map(slug => byId.get(String(slug))).filter(Boolean);
    if (!savedMentors.length) {
      state.innerHTML = '<div class="directory-message text-center"><span class="empty-icon">☆</span><h2>No saved mentors yet</h2><p>Save a mentor from the directory or a profile to see them here.</p><a href="?#/mentors" data-browse-all-mentors class="btn btn-primary btn-sm mt-5">Browse all mentors</a></div>';
      return;
    }
    state.innerHTML = `<div class="mb-5 text-sm text-muted">${savedMentors.length} saved mentor${savedMentors.length === 1 ? '' : 's'}</div><div id="wishlist-results" class="space-y-5">${savedMentors.map(DirectoryMentorCard).join('')}</div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;
    const saved = new Set(slugs);
    root.querySelectorAll('[data-save]').forEach(button => {
      const card = button.closest('[data-mentor-id]');
      const slug = card?.dataset.mentorId;
      button.setAttribute('aria-pressed', String(saved.has(slug)));
      button.setAttribute('aria-label', `Remove ${card?.dataset.name || 'mentor'} from wishlist`);
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await wishlistService.remove(slug);
          card?.remove(); saved.delete(slug);
          const results = root.querySelector('#wishlist-results');
          if (results && !results.children.length) state.innerHTML = '<div class="directory-message text-center"><span class="empty-icon">☆</span><h2>No saved mentors yet</h2><p>Save a mentor from the directory or a profile to see them here.</p><a href="?#/mentors" data-browse-all-mentors class="btn btn-primary btn-sm mt-5">Browse all mentors</a></div>';
        }
        catch (error) { const toast = root.querySelector('#toast'); if (toast) { toast.textContent = error.message; toast.hidden = false; } }
        finally { button.disabled = false; }
      });
    });
  } catch (error) {
    state.innerHTML = `<div class="directory-message text-center"><h2>We could not load your wishlist</h2><p>${esc(error.message || 'Please try again.')}</p><button id="wishlist-retry" class="btn btn-outline btn-sm mt-5">Try again</button></div>`;
    root.querySelector('#wishlist-retry')?.addEventListener('click', () => mountWishlist(root, mentors));
  }
}
