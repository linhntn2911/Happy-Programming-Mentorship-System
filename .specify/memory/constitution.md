<!--
Sync Impact Report (temporary review note; remove before committing this constitution)
Version: 1.0.0 -> 2.0.0; adopt the layered package diagram from linh for auth integration.
Principles: five placeholder slots replaced with Specification Traceability,
Application Boundaries, Data Integrity and Security, Consistent Accessible UI,
and Evidence-Based Completion.
Added sections: Technology and Product Constraints; Development Workflow and Quality Gates.
Removed sections: none; template examples removed.
Deferred placeholders: none. Templates and commands remain unchanged.
-->
# HappyProgramming Constitution

## Core Principles

### I. Specification Traceability

Meaningful features MUST follow the bounded Spec Kit workflow: specify, clarify high-impact
ambiguity, plan, tasks, analyze, implement, and converge. Existing code is implementation
context, not proof that requirements are satisfied. Authentication, authorization, payments,
database schema, public APIs, repository structure, and cross-application behavior MUST use
the full workflow. Small copy corrections and isolated reversible styling fixes may omit
a full feature directory.

Feature artifacts MUST identify user outcomes and acceptance scenarios. When context diagrams,
use cases, or package diagrams are required, the plan MUST map their relevant actors,
responsibilities, and dependencies to implementation and verification. Missing diagrams and
contradictory requirements MUST be recorded explicitly. Conformance MUST NOT be claimed
without comparison to the authoritative artifacts.

### II. Application Boundaries

Active work MUST target independently runnable `backend/` and `frontend/` applications.
The retired prototype MUST NOT become an implementation target. Following the approved package
alignment and auth integration, backend packages MUST use layers under `com.happyprogramming`
(controller, service, repository, dto, entity, config, security, and other implemented layers).
Controllers own HTTP concerns, services
own business rules and transactions, and repositories own persistence queries.
Public APIs MUST use Bean-validated request DTOs, response DTOs, and consistent errors;
they MUST NOT expose JPA entities. Empty abstraction layers MUST NOT be created solely
to fill a diagram.

Frontend pages MUST compose reusable components. HTTP calls MUST go through
`services/apiClient.js` and feature service modules. Authentication handling MUST remain
centralized. Public contracts MUST remain compatible unless the active spec approves a
breaking change and all affected consumers and artifacts are updated.

### III. Data Integrity and Security

`docs/database/init/schema_31_tables.sql` is immutable. Schema changes MUST use
Flyway/versioned migrations with corresponding dated scripts in `docs/database/migration/`
named `YYYYMMDD_description.sql`. Manual database edits MUST NOT substitute for migrations.

The backend MUST enforce authorization and resource ownership, including admin operations.
Payment callbacks MUST be treated as untrusted; payment operations MUST be idempotent.
Timestamp storage and timezone behavior MUST be documented consistently.
Passwords, database credentials, tokens, payment secrets, and private certificates MUST NOT
be committed or logged. Configuration examples MUST use non-secret sample values.
Uploads MUST validate type, size, ownership, and storage path. Dynamic API content MUST be
escaped or sanitized before HTML rendering. Security-sensitive decisions MUST be documented
in the feature plan.

### IV. Consistent and Accessible UI

User-facing copy MUST be English. `frontend/src/app.css` and `frontend/src/components/`
are the canonical design sources. Existing buttons, forms, cards, badges, alerts, modals,
tables, pagination, empty states, and avatars MUST be reused before adding variants.
New reusable states MUST be showcased before feature use.

The palette MUST retain primary `#8b46e8`, dark purple `#7431d0`, ink `#25143f`,
lavender `#f1e8ff`, cream `#fbf9ff`, and border `#e8e0f1`, with white cards and restrained
shadows. Views MUST support semantic HTML, associated labels, keyboard operation, visible
focus, meaningful alternative text, and responsive layouts from 320px upward.
Async views MUST provide applicable loading, empty, error, and success states, with accurate
disabled and pending control states.

### V. Evidence-Based Completion

Verification MUST cover applicable business rules, authorization boundaries, validation,
API contracts, repository queries, payment idempotency, and regressions. Avoid tests that
only repeat framework behavior or static implementation details.
Bug work MUST record observed behavior, assessed cause, scoped repair, and a regression
test or reproducible verification of the original symptom.

Build success or an HTTP success response alone MUST NOT be represented as complete use-case
coverage. Demo data MUST be labelled and MUST NOT count as verification of live database flows.
Reports MUST distinguish passed, skipped, blocked, and unverified checks.
Required unfinished tasks, migrations, contracts, or convergence gaps prevent completion claims.

## Technology and Product Constraints

HappyProgramming connects mentees and mentors for monthly mentorship and one-off sessions.
Its capabilities include discovery, applications, learning requests, scheduling, chat, reviews,
notifications, administration, and VNPay payments.

- Backend MUST use Java 17 and Spring Boot 3.5.x, exposing REST endpoints under `/api`
  without rendering frontend pages.
- Frontend MUST use Vite, Tailwind CSS 4, and modular JavaScript unless an approved
  specification explicitly changes that stack.
- Feature artifacts MUST live in numbered `specs/` directories with spec, plan, tasks,
  quickstart, and applicable contracts, data model, research, and checklists.
- Architecture and operational documentation MUST live in `docs/`.
- Existing user work MUST be preserved. Changes MUST be the smallest coherent scope,
  without unrelated refactors. Reproducible generated outputs MUST stay out of Git,
  except required production assets already committed by the repository.

## Development Workflow and Quality Gates

Read `AGENTS.md`, `CLAUDE.md`, local instructions, active feature artifacts, and relevant
code before editing. Resolve material conflicts explicitly. Work from ordered, independently
verifiable tasks and update task status only when supported by evidence.

Run narrow meaningful checks during development, then all affected application checks:

```text
backend/:  mvn test
frontend/: npm run build
frontend/: npm test
```

Affected frontend screens MUST be verified at 320px, tablet, and desktop widths, including
keyboard navigation, visible focus, absence of horizontal overflow, and relevant async states.
Before completion, compare implementation with spec, plan, contracts, migrations, and tasks;
append missing work and repeat until no material gaps remain. Documentation, configuration
examples, and component showcases MUST reflect the delivered behavior.

## Governance

This initial constitution adopts existing repository rules and the user's architecture and
requirements-traceability expectations. It does not assert that existing code already
satisfies every principle.

Decision precedence is: current explicit user request; active approved spec; plan, contracts,
and data model; tasks; this constitution; repository and local agent rules; existing code.
Conflicts MUST be reconciled explicitly rather than leaving contradictory artifacts.

Amendments MUST document rationale, affected principles, and impact on active work.
Use semantic versions: MAJOR for incompatible principle removals or redefinitions, MINOR
for new or materially expanded principles, PATCH for non-semantic clarification.
Record amendment dates and review compliance during planning, analysis, and convergence.
Exceptions MUST be explicit in higher-priority approved artifacts with their scope and
consequences documented. Routine implementation choices do not require another approval.

Amendment 2026-10-07: adopt the layered package diagram from linh for the requested integration.
This incompatible package-governance change increments the major version; other rules remain.

**Version**: 2.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-07
