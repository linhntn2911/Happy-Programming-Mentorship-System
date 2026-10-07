/** Shared directory navigation CTA, matching the homepage button. */
export function BrowseAllMentorsLink({ current = false } = {}) {
  return `<a href="?#/mentors" data-browse-all-mentors class="btn btn-light !min-h-10 !px-5 !py-2.5 whitespace-nowrap shrink-0"${current ? ' aria-current="page"' : ''}>Browse all mentors <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>`;
}
