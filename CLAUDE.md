# Claude Instructions for HappyProgramming

`AGENTS.md` is the canonical repository-wide policy. Read it completely before planning or changing code. This file adds Claude-specific working instructions and does not replace `AGENTS.md`.

## Start of Every Task

1. Read `AGENTS.md`.
2. Target the canonical `backend/` and `frontend/` applications.
3. Locate the active feature under `specs/` and read `spec.md`, `plan.md`, `tasks.md`, contracts, data model, and checklists that exist.
4. Read the closest README and any more specific `AGENTS.md` in the directory being changed.
5. For UI work, inspect the component source and component showcase before adding markup or styles.
6. State any compatibility boundary or unresolved requirement that materially changes the solution.

## Spec Kit Behavior

Treat HappyProgramming as an existing project. Do not generate a retrospective specification for the whole application. Create or update artifacts only for the bounded change being requested.

For non-trivial feature work, follow:

```text
constitution → specify → clarify → plan → tasks → analyze → implement → converge
```

Do not jump from an idea directly to implementation when the change affects authentication, authorization, payments, database schema, public APIs, application boundaries, or multiple user roles.

During implementation:

- Work in task order unless a dependency requires a documented adjustment.
- Mark completed tasks accurately; do not mark future work complete.
- When implementation reveals a false assumption, update the relevant artifact before continuing.
- Keep API contracts, database migrations, tests, and code in the same change.
- Run convergence after implementation and resolve material gaps before declaring completion.

## Repository Architecture & Migration

The single canonical architecture for HappyProgramming is the monorepo layout:

```text
HappyProgramming/
├── backend/       # Spring Boot REST API
├── frontend/      # Vite + Tailwind CSS + JavaScript client
├── specs/         # Spec Kit feature artifacts
├── docs/          # Architecture and operational documentation
├── AGENTS.md
└── CLAUDE.md
```
All active feature work, API endpoints, and client modules must target `backend/` and `frontend/`.

## Backend Expectations

- Use Java 17 and Spring Boot 3.5.x. Keep `HpmsApplication` in the root package.
- Put each role's Java classes directly in `com.happyprogramming.role.{admin,staff,mentor,mentee,auth,shared}`. Do not add layer subpackages inside a role. Mirror these packages in tests. Cross-role infrastructure stays in `config` and `security`.
- This flat role layout supersedes the older physical layer folders in `Package Diagram1.docx` and `specs/003-package-alignment`. Preserve controller → service → repository responsibilities, DTO/entity separation, authorization checks, and API contracts regardless of folder placement.
- Use Bean Validation and the shared exception response format. Never serialize JPA entities as API responses.
- Use versioned Flyway migration scripts under `docs/database/migration/` for schema changes; never edit the immutable `docs/database/init/schema_31_tables.sql` baseline. Preserve the documented `NNN_YYYYMMDD_<description>.sql` sequence format.
- Temporary development seed records must use a versioned migration and Repository/API reads; remove only seed data and seed mechanism when real flows exist.
- Make payment and other callback-driven operations idempotent and verifiable. Add focused coverage for changed behavior.

## Frontend Expectations

- Put role-owned modules directly in `frontend/src/roles/{admin,staff,mentor,mentee,auth,guest}/`. Do not nest `pages/components/services` inside role folders. Put reusable cross-role modules directly in `frontend/src/shared/`; keep `main.js`, `app.css`, and global `styles/` at the root.
- Keep test files beside their module. Preserve route URLs, API paths, exports, and behavior during file moves.
- Use established Tailwind tokens and UI components, English copy, and the purple/white identity. Add reusable styles to the design system and showcase.
- Keep page code responsible for composition and orchestration. Put HTTP logic in the owning role module and common request behavior in `shared/apiClient.js`.
- Render relevant loading, empty, error, disabled, and success states. Preserve accessibility, keyboard behavior, and reduced-motion support. No separate mobile viewport check unless requested.

## Visual Consistency

- Use the existing font stack and typography classes from `frontend/src/app.css` and the component showcase. Do not add a new font family, arbitrary font import, or isolated page typography.
- Reuse the established color tokens: brand purple `#8b46e8`, dark purple `#7431d0`, ink `#25143f`, lavender `#f1e8ff`, cream `#fbf9ff`, and border `#e8e0f1`. Do not create a competing palette or hardcode a different color when a token exists.
- Reuse shared buttons, inputs, cards, badges, spacing, borders, radii, shadows, and loading/error states so all pages remain synchronized with the homepage and component showcase.
- Add genuinely new visual patterns to the shared design system and showcase before using them in feature pages.

### Shared Admin, Staff, and Mentor workspace UI

Admin, Staff, and all Mentor workspace pages must use the single presentation system defined in `AGENTS.md` and `frontend/src/styles/admin.css`:
- **Shell & Navigation**: `.admin-shell` (246px navigation rail, 83px top bar, 36px gutters). Navigation rail with `{h} HappyProgramming`, uppercase eyebrow (`ADMIN WORKSPACE` / `STAFF WORKSPACE` / `MENTOR WORKSPACE`), `.admin-nav-link` with inline SVG icons and `aria-current="page"`, bottom note, and "Back to website".
- **Typography**: Display font Georgia (`var(--font-display)`) for 36px page titles; Be Vietnam Pro (`var(--font-body)`) for body and controls; uppercase purple `.eyebrow` for section subtitles.
- **Surfaces & Colors**: Cream background (`#fbf9ff`), white cards/panels with 1px border (`#e8e0f1`) and 14px radii, brand purple (`#8b46e8`), dark purple (`#7431d0`), lilac (`#f1e8ff`), and ink (`#25143f`).
- **Primitives**: `.admin-stats` grid of 4 `.stat-card`s, `.admin-panel` with `.admin-panel-heading` and `.admin-panel-body`, `.admin-toolbar`, `.data-table-scroll` + `.data-table`, restrained `.status-badge` pills with `●` (never use emojis), and `<dialog class="modal">` for operational reviews.

## Verification Commands

Canonical monorepo applications:

```bash
cd backend && ./mvnw test
cd ../frontend && npm run build && npm test
```

On Windows, use `mvnw.cmd` instead of `mvnw`.

Do not claim a command passed unless it was run successfully. If a tool or environment prevents a check, report the exact unverified check and preserve the work for review.

## Working Style

- Prefer direct, maintainable code over speculative abstractions.
- Reuse existing patterns and dependencies before adding new ones.
- Keep diffs focused and avoid unrelated formatting churn.
- Preserve existing behavior unless the specification changes it.
- Never add secrets or real credentials.
- Do not leave placeholder logic presented as a completed feature.
- Explain material tradeoffs in `plan.md`, not only in chat.
- Finish with the behavior changed, files affected, verification performed, and any remaining limitation.
