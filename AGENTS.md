# HappyProgramming Agent Guide

This file is the repository-wide operating agreement for coding agents. It applies to the repository root and every child directory. More specific `AGENTS.md` files may add local rules, but they must not weaken these rules.

Workflow reference: [GitHub Spec Kit](https://github.com/github/spec-kit) and its [existing-project guide](https://github.github.io/spec-kit/guides/existing-projects.html).

## Product

HappyProgramming is a programming mentorship platform that connects mentees with mentors for monthly mentorship and one-off sessions. The product includes mentor discovery, mentor applications, learning requests, scheduling, chat, reviews, notifications, administration, and VNPay-backed payments.

User-facing web copy is English. The visual language is bright purple and white, based on the supplied EduTeach reference and the current HappyProgramming component showcase.

## Repository Architecture

The canonical architecture for HappyProgramming is a monorepo with independently runnable applications:

```text
HappyProgramming/
├── backend/       # Spring Boot REST API
├── frontend/      # Vite + Tailwind CSS + JavaScript client
├── specs/         # Spec Kit feature artifacts
├── docs/          # Architecture and operational documentation
├── AGENTS.md
└── CLAUDE.md
```

The legacy prototype has been fully retired and replaced by `backend/` and `frontend/`. All feature implementation, architecture boundaries, and structural changes must target `backend/` and `frontend/`.

## Spec-Driven Development

Follow GitHub Spec Kit's process for non-trivial features and architectural changes. This is an existing project: do not attempt to retroactively specify the entire codebase. Specify the next bounded change and treat the current code as implementation context.

### Source of truth

Use this order when making decisions:

1. The user's current explicit request.
2. The active feature's approved `spec.md`.
3. The active feature's `plan.md`, contracts, and data model.
4. The active feature's `tasks.md`.
5. The project constitution in `.specify/memory/constitution.md`, when present.
6. This file and local `AGENTS.md` files.
7. Existing code and conventions.

If artifacts conflict, reconcile them explicitly. Do not silently implement one interpretation while leaving contradictory specifications behind.

### Feature workflow

For each meaningful feature:

1. **Constitution** — establish project principles once and amend them deliberately.
2. **Specify** — define user outcomes, scenarios, requirements, edge cases, and measurable success criteria. Avoid implementation details.
3. **Clarify** — resolve high-impact ambiguity before planning.
4. **Plan** — document architecture, dependencies, data changes, API contracts, security, rollout, and validation.
5. **Tasks** — create ordered, independently verifiable implementation tasks.
6. **Analyze** — check consistency and coverage across the specification, plan, contracts, and tasks.
7. **Implement** — work from `tasks.md`; update task state as work is completed.
8. **Converge** — compare the implementation with all artifacts, add missing tasks, and repeat until converged.

Use the command naming provided by the installed Spec Kit integration. Current Spec Kit installations may expose the stages with dotted or hyphenated names.

### Feature artifacts

Store one feature per numbered directory:

```text
specs/001-feature-name/
├── spec.md
├── plan.md
├── research.md          # when decisions require investigation
├── data-model.md        # when persistent data changes
├── quickstart.md        # validation and manual test path
├── tasks.md
├── checklists/
└── contracts/           # OpenAPI or other interface contracts
```

Specifications describe what users need and why. Plans describe how the repository will deliver it. Tasks describe the executable sequence. Do not place design choices in `spec.md` unless they are explicit constraints from the user.

Small copy corrections or isolated reversible styling fixes may skip a full feature directory. Authentication, payments, authorization, database schema, public API, repository structure, or cross-application behavior always require the full workflow.

For bugs, preserve separate evidence for observed behavior, assessed cause, scoped repair, and verification. A bug is not complete without a test or reproducible verification of the original symptom.

## Architecture Boundaries

### Backend

The target backend is Java 17 and Spring Boot 3.5.x. It exposes REST endpoints under `/api` and does not render frontend pages. Follow the canonical layered `com.happyprogramming` package layout.

Follow `Package Diagram1.docx`: organize backend code by layer under `com.happyprogramming`. This is the single canonical Java package layout:

```text
backend/src/main/java/com/happyprogramming/
├── HpmsApplication.java
├── config/
├── constant/
├── controller/
├── dto/
├── entity/
├── repository/
├── service/
├── security/
├── integration/
├── scheduler/
└── utils/
```

Create packages only when they contain implemented code; the diagram also describes planned capabilities. Do not add a competing capability-first root layout. Tests mirror production packages under `backend/src/test/java/com/happyprogramming/`. Keep the Spring Boot entry point in the root package so component, entity, and repository scanning covers its descendants.

- `controller` handles HTTP and delegates to `service`; never call repositories or external providers directly from controllers.
- `dto` contains API request/response types; `entity` contains persistence models; `repository` contains persistence queries.
- `service` owns business rules and transactions, and coordinates repositories and integration adapters.
- `config` wires application infrastructure; `security` enforces authentication, authorization, and ownership.
- `integration` wraps external services; `scheduler` invokes services for timed work; `constant` holds shared constants/enums; `utils` contains helpers without business orchestration.
- Use names such as `MentorController`, `MentorService`, `MentorRepository`, `CreateMentorshipRequest`, `MentorResponse`, `PaymentStatus`, and `VnPayClient`. Existing DTO/catalog names may remain when moving packages to preserve scope.
- The package diagram defines placement, not permission to implement all listed integrations. Implement only the active feature scope, and distinguish planned components from working code in documentation.

Backend rules:

- Controllers handle HTTP concerns and delegate business decisions.
- Services own business rules and transaction boundaries.
- Repositories own persistence queries.
- Never expose JPA entities as public API responses.
- Use request and response DTOs with Bean Validation.
- Return a consistent API response and error format.
- Use Flyway/versioned migrations for schema changes. Never rely on manual database edits.
- **Database Schema Management (`docs/database/`)**:
- `docs/database/init/`: Contains the baseline canonical schema (`schema_31_tables.sql`). This baseline is **IMMUTABLE** and must never be altered in place.
- `docs/database/migration/`: Any subsequent database change made during development (alter table, add column, new index/trigger, or data backfill) must be recorded in a separate migration script named `NNN_YYYYMMDD_<description>.sql` with a zero-padded 3-digit sequence number, the 8-digit date, and snake_case description (e.g. `001_20261006_add_user_first_last_name.sql`, `002_20261007_add_fresher_profile_level.sql`). Always increment the sequence number (`001`, `002`, `003`...) to guarantee unambiguous execution order even for multiple migrations created on the same day. Never edit or overwrite the init baseline to apply a change.
- Temporary development seed data is allowed only in a versioned migration and must be read through Repository/API code; never add a hardcoded frontend mock array for a database-backed feature. When the real create/update flow is complete, remove only the temporary seed records and the seed mechanism, preserving real records, official catalog data, and schema.
- Document API behavior in `contracts/` before implementing endpoints.
- Preserve backward compatibility unless the active specification explicitly approves a breaking change.
- Enforce authorization in the backend even when the frontend hides an action.
- Treat payment callbacks as untrusted input and make payment operations idempotent.
- Store timestamps consistently and document timezone behavior.

### Frontend

The target frontend is Vite, Tailwind CSS 4, and modular JavaScript unless an approved specification changes the stack.

```text
frontend/src/
├── components/
│   ├── layout/
│   ├── ui/
│   └── mentor/
├── pages/
├── services/
├── utils/
├── constants/
├── styles/
├── app.css
└── main.js
```

Frontend rules:

- Page modules compose reusable components; they do not duplicate component markup or styles.
- All HTTP calls go through `services/apiClient.js` and feature service modules.
- Keep authentication token handling centralized.
- Every async view needs loading, empty, error, and success behavior.
- Use semantic HTML, associated labels, keyboard-accessible controls, visible focus states, and meaningful alternative text.
- Keep user-facing copy in English.
- Do not inject unsanitized API content into `innerHTML`.

### Visual consistency

- Follow the existing web font stack and typography classes from `frontend/src/app.css` and the component showcase. Do not introduce a new font family, arbitrary font imports, or page-specific typography without an approved design-system change.
- Use the existing color tokens and component classes: brand purple `#8b46e8`, dark purple `#7431d0`, ink `#25143f`, lavender `#f1e8ff`, cream `#fbf9ff`, and border `#e8e0f1`. Do not introduce another palette or hardcoded colors when an existing token applies.
- New pages and components must reuse the current buttons, inputs, cards, badges, spacing, borders, radii, shadows, and states so the interface remains visually synchronized across homepage, directory, profile, and future modules.
- When a new visual treatment is genuinely needed, add it to the shared design system and component showcase before using it in a feature page.

## Design System

The canonical design source is:

```text
frontend/src/app.css
frontend/src/components/
```

Design requirements:

- Primary purple: `#8b46e8`.
- Dark purple: `#7431d0`.
- Ink: `#25143f`.
- Lavender: `#f1e8ff`.
- Cream background: `#fbf9ff`.
- Border: `#e8e0f1`.
- Prefer white cards, lavender support surfaces, purple primary actions, subtle borders, and restrained shadows.
- Reuse button, form, card, badge, alert, modal, pagination, table, empty-state, and avatar components before creating page-specific variants.
- Do not introduce another purple palette or copy EduTeach's yellow/black palette into the product.
- New reusable states must be added to the component source and showcased before use in a feature page.

## Security and Privacy

- Never commit passwords, API keys, tokens, database credentials, VNPay secrets, or private certificates.
- Provide `.env.example` or documented configuration keys with non-secret sample values.
- Validate and authorize file uploads by type, size, ownership, and storage path.
- Do not log credentials, authentication tokens, payment signatures, or sensitive personal data.
- Use server-side ownership checks for mentor, mentee, session, chat, review, and payment resources.
- Document security-sensitive decisions in the feature plan.

## Testing and Verification

Run the narrowest meaningful checks while developing, then the full checks affected by the change.

Canonical monorepo applications:

```bash
cd backend
./mvnw test

cd ../frontend
npm run build
npm test
```

On Windows, use `mvnw.cmd` instead of `mvnw`.

Add tests for business rules, authorization boundaries, validation, API contracts, repository queries, payment idempotency, and regressions. Avoid tests that only repeat framework behavior or assert static implementation details.

For frontend work, verify keyboard navigation, visible focus, and the loading, empty, error, disabled, and success states relevant to the feature. A mobile viewport build/check is not required unless the user explicitly requests it.

## Change Discipline

- Read the active specification and relevant existing code before editing.
- Make the smallest coherent change that satisfies the approved artifacts.
- Do not combine unrelated refactors with feature work.
- Do not rename API fields, database columns, routes, or component contracts without updating every affected artifact and consumer.
- Update documentation and examples when a public component or API contract changes.
- Keep generated outputs out of source control when they can be reproduced, except committed production assets already required by this repository.
- Do not report completion while required tasks, tests, migrations, contracts, or convergence gaps remain.

## Definition of Done

A change is complete when:

- The requested user outcomes and acceptance scenarios pass.
- The implementation matches the active specification and plan.
- API contracts and database migrations agree with the code.
- Relevant backend and frontend tests pass.
- The component showcase reflects reusable UI changes.
- Accessibility checks pass for affected screens.
- Documentation and configuration examples are current.
- `tasks.md` accurately records completed work.
- Convergence finds no material gaps.
