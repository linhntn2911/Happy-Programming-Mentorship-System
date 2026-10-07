# Plan: Mentor workspace shell

Use two hash routes under `#/mentor/` and one small shared page renderer. Reuse the established Header dropdown, browse link, footer, typography, and color tokens. Provide navigation to the existing dashboard/profile and the two new module shells.

The current scope is navigation and clearly labelled not-ready states only. Availability recurrence, timezone and exception rules, offering fields/prices, APIs, authorization, database persistence, and booking interactions are deferred to separately clarified feature specifications. No fake form controls or sample data are included.

## Validation

- Focused unit test verifies both module routes' content and honest inactive state.
- Run the frontend test suite and production Vite build.
