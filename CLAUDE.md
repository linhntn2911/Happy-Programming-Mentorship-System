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

- Use Java 17 and Spring Boot 3.5.x.
- Follow `Package Diagram1.docx` and the canonical layered layout under `com.happyprogramming` (`config`, `constant`, `controller`, `dto`, `entity`, `repository`, `service`, `security`, `integration`, `scheduler`, `utils`). Do not use the former `vn.happyprogramming` package layout.
- Keep `HpmsApplication` in the root package and mirror production packages in tests. Create packages only as implementations require them.
- Controllers delegate to services; services coordinate repositories and integrations. Keep DTOs separate from entities.
- Keep controllers thin and business rules in services.
- Use DTOs at API boundaries; do not serialize JPA entities directly.
- Use Bean Validation and the shared exception response format.
- Use Flyway for persistent schema changes. Never rely on manual database edits.
- Database Schema (`docs/database/`):
  - `docs/database/init/`: Contains baseline `schema_31_tables.sql`; never edit, overwrite, or append to this file.
  - `docs/database/migration/`: For every database change made during development, create a separate script named `NNN_YYYYMMDD_<description>.sql` with a zero-padded 3-digit sequence number, 8-digit date, and snake_case description (e.g. `001_20261006_add_user_first_last_name.sql`, `002_20261007_add_fresher_profile_level.sql`) to guarantee unambiguous execution order, and apply changes through that migration.
- Temporary development seed records may be added through a versioned migration for development only. Read them through Repository/API code, never through a hardcoded frontend array; remove the seed records and seed mechanism once the real create/update flow is available, while preserving real data, official catalog data, and schema.
- Apply authorization and ownership checks in the backend.
- Make VNPay and other callback-driven operations idempotent and verifiable.
- Add focused unit or integration coverage for changed behavior.

## Frontend Expectations

- Use the established Tailwind tokens and UI components.
- Keep the interface English and preserve the bright purple/white visual identity.
- Add reusable styles to the design system, then demonstrate them in the showcase.
- Keep page code responsible for composition and orchestration.
- Put HTTP logic in service modules and shared request behavior in `apiClient`.
- Render loading, empty, error, disabled, and success states where relevant.
- Preserve accessibility, keyboard behavior, and reduced-motion support. Do not add a separate mobile viewport build/check unless the user explicitly requests it.

## Visual Consistency

- Use the existing font stack and typography classes from `frontend/src/app.css` and the component showcase. Do not add a new font family, arbitrary font import, or isolated page typography.
- Reuse the established color tokens: brand purple `#8b46e8`, dark purple `#7431d0`, ink `#25143f`, lavender `#f1e8ff`, cream `#fbf9ff`, and border `#e8e0f1`. Do not create a competing palette or hardcode a different color when a token exists.
- Reuse shared buttons, inputs, cards, badges, spacing, borders, radii, shadows, and loading/error states so all pages remain synchronized with the homepage and component showcase.
- Add genuinely new visual patterns to the shared design system and showcase before using them in feature pages.

### Shared Admin and Staff workspace UI

Admin and Staff workspaces must strictly adhere to the single presentation system defined in `AGENTS.md` and `frontend/src/styles/admin.css`:
- **Shell & Navigation**: `.admin-shell` (246px navigation rail, 83px top bar, 36px gutters). Navigation rail with `{h} HappyProgramming`, uppercase eyebrow (`ADMIN WORKSPACE` / `STAFF WORKSPACE`), `.admin-nav-link` with inline SVG icons and `aria-current="page"`, bottom note, and "Back to website".
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
