# Tasks: Mentor Dashboard Overview

## Dashboard visual alignment follow-up

- [X] Reuse the Admin/Staff shell and shared metric/panel styles for the mentor dashboard without changing its API calls, request decisions, SLA timer, or notices.
- [X] Run the frontend test suite and production build after the layout change.

**Input**: Design documents from `/specs/002-mentor-dashboard-overview/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [API contract](./contracts/mentor-dashboard-api.md), [quickstart.md](./quickstart.md)

## Phase 1: Setup

**Purpose**: Confirm datasource settings and set a verification baseline.

- [X] T001 Verify the SQL Server driver, Java 17 target, local `HappyProgramming` URL, and dialect in `backend/pom.xml` and `backend/src/main/resources/application.properties`; record that local port 1433 must be online for database verification.

## Phase 2: Foundational

**Purpose**: Harden connection lifecycle configuration and shared dashboard error behavior before building stories.

- [ ] T002 Make conservative Hikari lifecycle defaults explicit (`connection-timeout=30000`, `keepalive-time=120000`, and `max-lifetime=1800000`) in `backend/src/main/resources/application.properties`; do not change pool size or add unsupported SQL Server retry options, and preserve environment-only `DB_PASSWORD`, current SQL Server URL defaults, `SQLServerDialect`, and `spring.jpa.hibernate.ddl-auto=none`.
- [ ] T003 Add safe handling for database access failures to `backend/src/main/java/vn/happyprogramming/mentor/MentorApiExceptionHandler.java`, returning a generic retryable 503 `ApiResponse` without SQL/vendor details and logging no credentials or query values.
- [ ] T004 Expose a package-visible active local-demo mentor identity guard from `backend/src/main/java/vn/happyprogramming/mentor/MentorService.java` for reuse by dashboard operations; keep identity server-configured, active-mentor checked, and default-off.

**Checkpoint**: Datasource configuration and safe server-side mentor identity boundary are ready.

## Phase 3: User Story 1 - Review mentor overview (Priority: P1) 🎯 MVP

**Goal**: Load the summary metrics and incoming request list from SQL Server and render a responsive dashboard.

**Independent Test**: With repository data or mocks, load the current mentor's dashboard and verify lifetime earnings after successful refunds and saved commission snapshots, pending request count, average published rating, correct request rows, empty states, and database error behavior.

### Tests for User Story 1

- [ ] T005 [P] [US1] Add service tests for mentor-scoped net earnings, pending counts, average ratings, empty states, and database failures in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardServiceTest.java`.
- [ ] T006 [P] [US1] Add GET dashboard response-envelope and disabled-identity contract tests in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardControllerTest.java`.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Add internal dashboard summary, request, and aggregate response DTOs with nullable empty rating, VND currency, full learning goals, bounded goal summary, UTC submitted/deadline timestamps, and linked current offering name only (no price or immutable-snapshot claim) in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardSummary.java`, `MentorDashboardRequest.java`, and `MentorDashboardResponse.java`.
- [ ] T008 [P] [US1] Map only the mentorship request columns required by the dashboard (`id`, `mentee_id`, `mentor_id`, `service_id`, `learning_goals`, `status`, `submitted_at`, `response_deadline`, and `responded_at`) in `backend/src/main/java/vn/happyprogramming/mentor/MentorshipRequest.java`.
- [ ] T009 [US1] Add native SQL Server projections for lifetime successful-payment earnings (successful refunds subtracted, immutable commission snapshot applied per payment and rounded to two currency decimals), pending count, reviews filtered to `visibility_status = 'PUBLISHED'` for average/count, and mentor-owned request rows with current linked offering name only in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardRepository.java`.
- [ ] T010 [US1] Add read-only lookup for pending requests scoped to the server-resolved mentor identity in `backend/src/main/java/vn/happyprogramming/mentor/MentorshipRequestRepository.java`; keep request state unchanged in this user story.
- [ ] T011 [US1] Implement dashboard aggregation and active mentor identity validation in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardService.java`, without success-shaped fallbacks or client-provided mentor IDs.
- [ ] T012 [US1] Add `GET /api/mentors/me/dashboard` to `backend/src/main/java/vn/happyprogramming/mentor/MentorController.java` and preserve all existing mentor and skill routes.
- [ ] T013 [P] [US1] Add `getMyDashboard` to `frontend/src/services/mentorDashboardService.js` using `frontend/src/services/apiClient.js`.
- [ ] T014 [P] [US1] Create the reusable accessible summary metric card in `frontend/src/components/mentor/DashboardMetricCard.js` and demonstrate its states in `frontend/src/pages/ComponentShowcasePage.js`.
- [ ] T015 [US1] Build `frontend/src/pages/MentorDashboardPage.js` with async loading, retryable error, metric and request empty states, safe DOM/text rendering, package/mentee/goal summary columns, and a UTC SLA timer with expired actions disabled.
- [ ] T016 [US1] Register `#/mentor/dashboard` and initialize the dashboard page in `frontend/src/main.js`; add a dashboard navigation entry in `frontend/src/components/layout/Header.js` without changing homepage routing behavior.

**Checkpoint**: Mentor can load summary metrics and see request/package/goal/SLA context; existing routes remain functional.

## Phase 4: User Story 2 - Respond to incoming mentorship requests (Priority: P1)

**Goal**: Allow a mentor to inspect full request details and atomically accept or reject a still-pending owned request.

**Independent Test**: A pending owned request can be accepted or rejected exactly once before its deadline; overdue, previously decided, and other-mentor requests are unchanged; acceptance creates no payment, subscription, escrow, or workspace records.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add service tests for successful accept/reject, expired/conflicting request, cross-mentor isolation, zero-row updates, and idempotent retries in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardServiceTest.java`.
- [ ] T018 [P] [US2] Add decision endpoint validation, success, conflict, and generic ownership-failure contract tests in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardControllerTest.java`.
- [ ] T019 [P] [US2] Add an environment-gated SQL Server integration test for the pending-to-accepted/rejected transition and verify acceptance creates no payment/subscription/escrow rows in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardTransactionIntegrationTest.java`.

### Implementation for User Story 2

- [ ] T020 [P] [US2] Add the request decision DTO accepting only `ACCEPTED` or `REJECTED` and a safe decision result DTO in `backend/src/main/java/vn/happyprogramming/mentor/MentorRequestDecisionRequest.java` and `MentorRequestDecisionResponse.java`.
- [ ] T021 [US2] Implement a transactional decision operation in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardService.java` and the conditional update in `backend/src/main/java/vn/happyprogramming/mentor/MentorshipRequestRepository.java`; require mentor ownership, `status = 'PENDING'`, and `response_deadline >= SYSUTCDATETIME()`, set response/update UTC timestamps, and return an opaque conflict when no row is changed.
- [ ] T022 [US2] Add `PUT /api/mentors/me/requests/{requestId}/decision` with path and body validation in `backend/src/main/java/vn/happyprogramming/mentor/MentorController.java`; do not initiate any payment or related financial/workspace operation.
- [ ] T023 [US2] Add an accessible full-goals/package Details dialog, Accept/Reject controls, duplicate-click prevention, result announcement, and dashboard refresh behavior in `frontend/src/pages/MentorDashboardPage.js`.
- [ ] T024 [US2] Add `decideOnRequest(requestId, decision)` to `frontend/src/services/mentorDashboardService.js` and send only the accepted decision value, never mentor identity.

**Checkpoint**: The request decision is safely available to the mentee's existing checkout step and causes no financial side effects.

## Phase 5: User Story 3 - See cancellation and refund notices (Priority: P2)

**Goal**: Show recent cancellation and refund state projections sourced from existing records.

**Independent Test**: Seed cancellation/refund states for two mentors and verify the current mentor sees only matching events, newest first, capped at 10, with an explicit empty state.

### Tests for User Story 3

- [ ] T025 [P] [US3] Add service tests for cancelled requests, cancelled subscriptions, current refund states and available timestamps, empty notices, newest-first ordering, 10-summary cap, and cross-mentor isolation in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardServiceTest.java`.
- [ ] T026 [P] [US3] Add an environment-gated SQL Server query test for the dashboard notice projection in `backend/src/test/java/vn/happyprogramming/mentor/MentorDashboardTransactionIntegrationTest.java`.

### Implementation for User Story 3

- [ ] T027 [P] [US3] Add safe cancellation/refund summary DTOs with composed stable ID, nullable request ID, current source status, UTC occurredAt, nullable successful-refund completedAt, and bounded message in `backend/src/main/java/vn/happyprogramming/mentor/MentorSystemNotice.java`.
- [ ] T028 [US3] Add read-only SQL Server projections for cancelled requests/subscriptions and current associated refund states; sort cancellation summaries by cancellation time and refund summaries by `requested_at`, limit to 10 mentor-owned items, and do not imply status-history retention in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardRepository.java`.
- [ ] T029 [US3] Include notices in the dashboard response without creating a new notification table or changing the source records in `backend/src/main/java/vn/happyprogramming/mentor/MentorDashboardService.java`.
- [ ] T030 [US3] Render system cancellation/refund notices and their empty state using safe text rendering in `frontend/src/pages/MentorDashboardPage.js`.

**Checkpoint**: Mentor sees only current persisted cancellation/refund information relevant to their own records.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the integrated feature, UI accessibility, and configuration scope.

- [ ] T031 [P] Add focused dashboard formatting and API service tests in `frontend/src/pages/MentorDashboardPage.test.js` and `frontend/src/services/mentorDashboardService.test.js`, and change the test script in `frontend/package.json` to run them with Node.js built-in `node --test` without adding dependencies.
- [ ] T032 Run focused backend tests, `mvn -f backend/pom.xml test`, `npm run build`, and `npm test`; record database-gated tests as blocked/skipped unless SQL Server is available in `specs/002-mentor-dashboard-overview/quickstart.md`.
- [ ] T033 Verify dashboard success/loading/error/empty/detail/decision paths, keyboard focus, safe API text, and no horizontal overflow at 320px, 768px, and 1440px; record results in `specs/002-mentor-dashboard-overview/quickstart.md`.
- [ ] T034 Verify `git diff --check`, inspect that SQL Server credentials remain environment-only and no schema/financial side effects were added, and update completion notes in `specs/002-mentor-dashboard-overview/plan.md`.
- [X] T035 Prevent the dashboard from remaining in loading state on stalled requests using the shared API timeout and guaranteed loading reset; in development only, show labelled sample data with decision actions disabled, and verify dashboard/profile routes and CORS.

## Dependencies

- Setup T001 precedes T002.
- Foundational tasks T002–T004 precede all user stories.
- User Story 1 (T005–T016) provides the base response and request rows used by User Story 2 and User Story 3.
- User Story 2 (T017–T024) depends on the request rows and repository infrastructure from User Story 1.
- User Story 3 (T025–T030) depends on the shared dashboard response from User Story 1.
- User Story 2 and User Story 3 can proceed independently after User Story 1's shared dashboard foundation is complete.
- Polish tasks T031–T034 depend on all three stories.

## Parallel Execution Examples

### User Story 1

```text
T005 service tests || T006 controller tests
T007 DTOs || T008 request entity
T013 frontend service || T014 metric card/showcase
```

### User Story 2

```text
T017 service tests || T018 controller tests || T019 SQL Server integration test
T020 decision DTOs || T024 frontend API call
```

### User Story 3

```text
T025 service tests || T026 SQL Server query test || T027 notice DTO
```

## Implementation Strategy

1. Complete the datasource and identity/error foundation without exposing credentials or hiding database outages.
2. Deliver User Story 1 as the MVP: one backend dashboard payload and responsive summary/request overview.
3. Add atomic request decisions as User Story 2; verify the approval-first behavior and no financial side effects.
4. Add read-only cancellation/refund notice projections as User Story 3.
5. Complete browser, build, test, and config-scope checks. Do not claim a live database transaction passed until SQL Server and credentials are available.
