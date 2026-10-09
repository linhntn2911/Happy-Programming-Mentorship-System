# Implementation Plan: Mentor Search

## Architecture

- Extend `GET /api/mentors` with optional query parameters while preserving the existing default catalog response.
- Keep filtering in `MentorCatalog` for the current seeded prototype. Replace it with parameterized JPA repository queries when production seed data is introduced.
- Add `#/mentors` as a frontend route and use `mentorService` as the only API boundary.
- Reuse global UI tokens, buttons, save control, footer, typography, and mentor imagery.

## API parameters

`q`, repeated `skills`, `minExperience`, `maxPrice`, `minRating`, `available`, and `sort`.

## Security and data rules

The production repository query must include only approved, public, active mentor profiles; only active `service_offerings` and verified `mentor_skills` may contribute to filtering and cards.

## Validation

- MockMvc verifies combined filters and empty results.
- Vite production build verifies modules and Tailwind output.
- Manual browser verification covers filtering behavior and active filter state.

## Shared discovery metadata

`frontend/src/constants/mentorDiscovery.js` owns homepage topic labels and category membership. The prototype service applies category matching to the unpaginated API result after server filters; categories are URL state, not a new API parameter. Move category filtering to the backend before introducing pagination. Sidebar skills derive from the full catalog, never filtered results.

Regression evidence: search previously overwrote the catalog, causing options to disappear after revisiting the directory. Preserve the catalog during searches. Verify category membership, sidebar skill coverage, and the frontend build.

## Browse-all navigation repair

- Observed: select Java, return home, then Browse all mentors restores Java filtering.
- Cause: hash-only links retain the URL query string used to initialize filters.
- Repair: explicit browse-all anchors clear the query in their href and use the existing directory navigation function for ordinary clicks. This also resets filters when the hash is already /mentors. Modified clicks retain native browser navigation; skill links remain unchanged. Navigation labels use Browse all mentors.
- Verification: focused Node execution of the actual navigation function and click handler passed for home-to-directory, same-route reset, modified clicks, untouched skill navigation, and keyword search. Vite production build passed.
