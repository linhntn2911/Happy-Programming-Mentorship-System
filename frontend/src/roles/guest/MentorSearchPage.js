import { BrowseAllMentorsLink } from '../../shared/BrowseAllMentorsLink.js';
import { DirectoryMentorCard } from '../../shared/DirectoryMentorCard.js';
import { MENTOR_CATEGORIES, mentorMatchesCategory, mentorSkillOptions } from './mentorDiscovery.js';
import { Footer } from '../../shared/Footer.js';
import { renderUserDropdown } from '../../shared/Header.js';
import { authService } from '../auth/authService.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const optionList = (mentors, getValues) => {
  const counts = new Map();
  mentors.forEach(mentor => {
    const values = getValues(mentor);
    (Array.isArray(values) ? values : [values]).filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

function filterSection({ title, name, options, selected = [], searchable = true, visible = 5 }) {
  const rows = options.map(([label, count], index) => `
    <label class="filter-check filter-option ${index >= visible ? 'is-extra' : ''}" data-option-label="${escapeHtml(label.toLowerCase())}" ${index >= visible && !selected.includes(label) ? 'hidden' : ''}>
      <input type="checkbox" name="${name}" value="${escapeHtml(label)}" ${selected.includes(label) ? 'checked' : ''}>
      <span>${escapeHtml(label)}</span><small>${count}</small>
    </label>`).join('');
  return `
    <details class="directory-filter-section" open>
      <summary>${title}<svg class="icon" viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"/></svg></summary>
      ${searchable ? `<input class="filter-option-search" type="search" data-option-search="${name}" placeholder="Search ${title.toLowerCase()}" aria-label="Search ${title.toLowerCase()}">` : ''}
      <div class="filter-options" data-filter-options="${name}">${rows || '<p class="text-xs text-muted">No options available</p>'}</div>
      ${options.length > visible ? `<button class="show-options" type="button" data-show-options="${name}" aria-expanded="false">Show more</button>` : ''}
    </details>`;
}

export function MentorSearchPage(mentors = [], state = {}) {
  const currentUser = authService.getCurrentUser();
  const displayName = currentUser?.name || currentUser?.email || '';
  const initials = displayName ? (displayName.trim().split(/\s+/).filter(Boolean).length > 1 ? (displayName.trim().split(/\s+/)[0][0] + displayName.trim().split(/\s+/).slice(-1)[0][0]).toUpperCase() : displayName.slice(0, 2).toUpperCase()) : 'U';

  const groups = [
    filterSection({ title: 'Categories', name: 'categories', options: MENTOR_CATEGORIES.map(({ label }) => [label, mentors.filter(mentor => mentorMatchesCategory(mentor, label)).length]), selected: state.categories || [], searchable: false }),
    filterSection({ title: 'Skills', name: 'skills', options: mentorSkillOptions(mentors), selected: state.skills || [], visible: Number.POSITIVE_INFINITY }),
    filterSection({ title: 'Job titles', name: 'jobTitles', options: optionList(mentors, mentor => mentor.role), selected: state.jobTitles || [] }),
    filterSection({ title: 'Companies', name: 'companies', options: optionList(mentors, mentor => mentor.company), selected: state.companies || [] }),
    filterSection({ title: 'Languages', name: 'languages', options: optionList(mentors, mentor => mentor.languages || []), selected: state.languages || [], searchable: false }),
    filterSection({ title: 'Country', name: 'countries', options: optionList(mentors, mentor => mentor.country), selected: state.countries || [], searchable: false })
  ].join('');

  return `
  <header class="directory-header">
    <div class="container flex h-[76px] items-center justify-between gap-5">
      <a href="#/" class="flex items-center gap-2.5" aria-label="HappyProgramming home">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] bg-brand font-mono text-xl font-bold text-white">{h}</span>
        <span class="hidden text-[16px] font-semibold tracking-tight sm:block">Happy<span class="text-brand">Programming</span></span>
      </a>
      <nav class="flex items-center gap-3" aria-label="Main navigation">
        ${BrowseAllMentorsLink({ current: true })}
        ${currentUser
          ? renderUserDropdown({ currentUser, displayName, initials, isMobile: false })
          : `
          <a href="#/login" class="btn btn-outline btn-sm">Log in</a>
          <a href="#/signup" class="btn btn-primary btn-sm hidden sm:inline-flex">Get started</a>
        `}
      </nav>
    </div>
  </header>

  <main class="min-h-screen bg-cream">
    <section class="directory-hero">
      <div class="container py-12 sm:py-16">
        <p class="eyebrow">1-ON-1 PROGRAMMING MENTORSHIP</p>
        <h1 class="mt-3 font-display text-4xl leading-tight sm:text-5xl">Find a mentor who fits<br class="hidden sm:block"> your next goal.</h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-muted">Search experienced developers by name, company, role, or skill. Compare verified expertise, ratings, experience, and monthly plans before you apply.</p>
        <form id="directory-search" class="directory-search mt-7" role="search">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
          <label class="sr-only" for="directory-query">Search mentors</label>
          <input id="directory-query" name="q" value="${escapeHtml(state.q || '')}" placeholder="Search by name, company, job title, or skill" autocomplete="off" maxlength="100">
          <button class="btn btn-primary" type="submit">Search mentors</button>
        </form>
      </div>
    </section>

    <section class="container py-8 sm:py-10">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-brand">MENTOR DIRECTORY</p>
          <p id="result-count" class="mt-1 text-sm text-muted" aria-live="polite">${mentors.length} mentor${mentors.length === 1 ? '' : 's'} found</p>
        </div>
        <div class="flex items-center gap-3">
          <button id="mobile-filter-button" class="btn btn-outline btn-sm lg:hidden" aria-controls="filter-panel" aria-expanded="false">
            <svg class="icon h-4 w-4" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg> Filters <span id="mobile-filter-count"></span>
          </button>
          <label class="sort-control">Sort by
            <select id="sort" name="sort">
              <option value="recommended" ${!state.sort || state.sort === 'recommended' ? 'selected' : ''}>Recommended</option><option value="rating" ${state.sort === 'rating' ? 'selected' : ''}>Top rated</option>
              <option value="experience" ${state.sort === 'experience' ? 'selected' : ''}>Most experienced</option><option value="price-low" ${state.sort === 'price-low' ? 'selected' : ''}>Lowest price</option><option value="price-high" ${state.sort === 'price-high' ? 'selected' : ''}>Highest price</option>
            </select>
          </label>
        </div>
      </div>

      <div id="active-filters" class="mb-5 flex flex-wrap gap-2" hidden></div>

      <div class="directory-layout">
        <aside id="filter-panel" class="filter-panel" aria-label="Mentor filters">
          <div class="flex items-center justify-between border-b border-line pb-4">
            <h2 class="text-sm font-semibold">Filter mentors</h2>
            <button id="clear-filters" class="text-xs font-semibold text-brand">Clear all</button>
          </div>
          ${groups}
          <details class="directory-filter-section" open>
            <summary>Quick filters<svg class="icon" viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"/></svg></summary>
            <label class="filter-check"><input type="checkbox" name="available" value="true" ${state.available === 'true' ? 'checked' : ''}><span>Available now</span></label>
            <label class="filter-check"><input type="checkbox" name="minRating" value="4.8" ${state.minRating === '4.8' ? 'checked' : ''}><span>Top rated · 4.8+</span></label>
            <label class="filter-check"><input type="checkbox" name="minExperience" value="7" ${state.minExperience === '7' ? 'checked' : ''}><span>7+ years experience</span></label>
          </details>
          <details class="directory-filter-section" open>
            <summary>Price range<svg class="icon" viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"/></svg></summary>
            <div class="price-range">
              <label><span>From</span><input type="number" name="minPrice" min="0" step="100000" value="${escapeHtml(state.minPrice || '')}" placeholder="0"></label>
              <span>to</span>
              <label><span>Up to</span><input type="number" name="maxPrice" min="0" step="100000" value="${escapeHtml(state.maxPrice || '')}" placeholder="3,000,000"></label>
            </div>
            <p class="mt-2 text-[10px] text-muted">Monthly price in VND</p>
          </details>
          <button id="apply-mobile-filters" class="btn btn-primary mt-5 w-full lg:hidden">Show mentors</button>
        </aside>

        <div>
          <div id="directory-loading" class="directory-loading" hidden><span></span><p>Finding the right mentors…</p></div>
          <div id="directory-error" class="directory-message" hidden><h2>We could not load mentors.</h2><p>Please check the API and try again.</p><button id="retry-search" class="btn btn-outline btn-sm mt-4">Try again</button></div>
          <div id="directory-empty" class="directory-message" ${mentors.length ? 'hidden' : ''}><span class="empty-icon">⌕</span><h2>No mentors match your search</h2><p>Remove a filter or try a broader keyword.</p><button id="empty-clear" class="btn btn-primary btn-sm mt-4">Clear search and filters</button></div>
          <div id="mentor-results" class="space-y-5">${mentors.map(DirectoryMentorCard).join('')}</div>
        </div>
      </div>
    </section>
  </main>
  ${Footer()}
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>`;
}
