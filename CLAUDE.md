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

- Use Java 25 and Spring Boot 3.5.x.
- Prefer capability-based packages over global controller/service/repository folders.
- Keep controllers thin and business rules in services.
- Use DTOs at API boundaries; do not serialize JPA entities directly.
- Use Bean Validation and the shared exception response format.
- Use Flyway for persistent schema changes.
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
- Preserve accessibility, keyboard behavior, responsive layout, and reduced-motion support.

## Verification Commands

Canonical monorepo applications:

```bash
cd backend && mvn test
cd ../frontend && npm run build && npm test
```

Legacy verification (during migration from `happyprogramming/`):

```bash
cd happyprogramming && npm run css:build && mvn test
```

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
