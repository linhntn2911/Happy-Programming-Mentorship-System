# Plan: Mentor workspace shell

Use the existing hash routes under `#/mentor/` and one shared Mentor layout based on the Admin/Staff workspace shell. Dashboard, Profile, Availability, and Packages render through that layout with their own active navigation state. Keep the existing content hooks, form IDs, API calls, and data/event logic unchanged. Public mentor profiles continue to use the website header and footer.

The current scope is navigation and clearly labelled not-ready states only. Availability recurrence, timezone and exception rules, offering fields/prices, APIs, authorization, database persistence, and booking interactions are deferred to separately clarified feature specifications. No fake form controls or sample data are included.

## Validation

- Focused unit test verifies both module routes' content and honest inactive state, and that all Mentor workspace routes use the shared shell with the correct active navigation item.
- Run the frontend test suite and production Vite build.
