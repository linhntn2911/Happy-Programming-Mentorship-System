# Feature Specification: Mentor Search and Filters

**Status:** Implemented  
**Scope:** Mentee Module 1.1

## User story

As a guest or mentee, I want to search and filter public mentors so that I can find a mentor who matches my goals and budget before viewing a profile or applying.

## Functional requirements

- Search is case-insensitive across mentor name, company, job title, specialty, and skills.
- Submitting the homepage hero search opens the directory with that keyword applied. Selecting a homepage topic opens the directory with the matching Categories checkbox selected.
- Users can combine Skills, Job titles, Companies, Languages, Country, Quick filters, and a monthly Price range.
- Each long category supports local option search, result counts, collapse/expand, and show more/show less controls.
- Multiple selected skills use AND matching.
- Users can sort by recommendation, rating, experience, or price.
- Only the mentor directory is in scope. Profile detail and server-backed wishlist remain separate Module 1 stories.
- The page displays result count, active filter summary, loading, API error, and empty-result states.
- All user-facing copy is English and the existing purple/white design tokens remain canonical.

## Acceptance scenarios

1. Given a mentor at VNG with Python, when the user searches `VNG` and selects Python, 7+ years, price up to 3,000,000 VND, and rating 4.9+, then Hoang Nam Le is returned.
2. Given no matching mentor, when a user searches `NonExistentStack123`, then the page shows the empty state and a clear-filters action.
3. Given the desktop web directory, when the user opens Filters, then filters appear in the filter panel and apply through the Show mentors button.
4. Given a backend failure, the current results are replaced by an actionable retry state.

## Success criteria

- API filters yield deterministic results and reject no valid combination.
- Search and filter controls are keyboard accessible and have visible focus states.
- The production frontend build and backend MockMvc tests pass.

## Discovery consistency

- Homepage topics and directory Categories use identical labels and category membership. Selected categories match any selected category, combined with all other filters.
- Skills contains every skill displayed on catalog cards, including Java, System Design, and SQL. All skill options are visible by default.
- Filtering must not shrink the full catalog used to build sidebar options or homepage cards. Selected options remain visible when lists are collapsed.
- Reloading a category URL restores its selection; Clear all clears the keyword and every filter.
- Browse all mentors navigation opens the complete directory with no keyword, filters, or custom sort, including after returning home and when already on the directory. Skill links continue to open filtered results.
