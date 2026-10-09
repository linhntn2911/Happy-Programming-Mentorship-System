> Historical note: backend role-folder placement was superseded by `specs/013-backend-package-diagram`; the frontend role layout remains current.

# Role code organization

## Outcome

Developers can locate code for a user role in one flat folder per role in both applications. Cross-role modules have one shared home. Existing user journeys, routes, APIs, and database data remain unchanged.

## Acceptance

- Admin, staff, mentor, mentee, and auth code is grouped by role; public guest code is grouped in the frontend.
- A role folder contains files directly, without `pages`, `components`, or `services` subfolders.
- Shared modules remain reusable and tests remain discoverable.
- Both application test suites and the frontend production build pass after import/package updates.
- Repository instructions state the same canonical layout.
