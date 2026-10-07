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

The target backend is Java 25 and Spring Boot 3.5.x. It exposes versioned REST endpoints under `/api` and does not render frontend pages after the frontend split is complete.

Organize backend code by business capability:

```text
backend/src/main/java/vn/happyprogramming/
├── common/
├── auth/
├── user/
├── mentor/
├── skill/
├── mentorship/
├── session/
├── payment/
├── chat/
├── review/
├── notification/
└── admin/
```

Within a capability, use controller, service, repository, DTO, mapper, and domain/entity types only when needed. Avoid empty abstraction layers.

Backend rules:

- Controllers handle HTTP concerns and delegate business decisions.
- Services own business rules and transaction boundaries.
- Repositories own persistence queries.
- Never expose JPA entities as public API responses.
- Use request and response DTOs with Bean Validation.
- Return a consistent API response and error format.
- Use Flyway migrations for schema changes. Never rely on manual database edits.
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
- Preserve responsive behavior from 320px upward.

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
mvn test

cd ../frontend
npm run build
npm test
```

Add tests for business rules, authorization boundaries, validation, API contracts, repository queries, payment idempotency, and regressions. Avoid tests that only repeat framework behavior or assert static implementation details.

For frontend work, verify at least:

- 320px mobile viewport.
- A tablet viewport.
- A desktop viewport.
- Keyboard navigation and visible focus.
- Loading, empty, error, disabled, and success states relevant to the feature.
- No horizontal overflow.

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
- Accessibility and responsive checks pass for affected screens.
- Documentation and configuration examples are current.
- `tasks.md` accurately records completed work.
- Convergence finds no material gaps.
