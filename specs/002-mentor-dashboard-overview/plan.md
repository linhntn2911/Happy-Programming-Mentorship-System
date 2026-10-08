# Implementation Plan: Mentor Dashboard Overview

**Branch**: `002-mentor-dashboard-overview` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add a mentor dashboard backed by the existing SQL Server schema: lifetime net earnings computed per successful payment using its stored commission snapshot and successful refund total, current pending request count and 48-hour SLA rows, average published rating, and recent cancellation/refund notices. Add guarded, conditional ACCEPTED/REJECTED transitions without creating checkout or escrow data. Harden the existing SQL Server/Hikari settings conservatively while preserving environment-only credentials and the explicit SQL Server dialect.

## Technical Context

**Language/Version**: Java 17 (current explicit `backend/pom.xml` setting); JavaScript ES modules  
**Primary Dependencies**: Spring Boot 3.5.6, Spring Data JPA, SQL Server JDBC driver, Vite 6, Tailwind CSS 4  
**Storage**: Existing SQL Server database `HappyProgramming`, schema in `docs/database/init/schema_31_tables.sql`; no schema migration  
**Testing**: Maven focused unit and MockMvc tests; SQL Server-backed integration tests are environment-gated; Vite production build and browser validation  
**Target Platform**: Local Windows development and responsive web browser  
**Project Type**: Spring Boot REST backend and Vite frontend  
**Performance Goals**: Load dashboard aggregates in bounded queries; return no unrelated mentor rows; update a request through one conditional database transition  
**Constraints**: Preserve `GET /api/mentors` and profile routes; retain environment-provided DB credentials; no client-supplied mentor identity; do not create payment/subscription/escrow data when a request is accepted; no schema changes; display financial data in the current platform currency (VND)  
**Scale/Scope**: One dashboard response, one request decision endpoint, three summary values, pending request table, recent cancellation/refund notices, and responsive navigation/page

## Constitution Check

The checked-in `.specify/memory/constitution.md` still contains only template placeholders. It has no ratified MUST principles to apply. The repository's operative `AGENTS.md` and `CLAUDE.md` rules are used below.

- Capability-based backend package and thin controller: **Pass**.
- DTO boundaries; entities remain internal: **Pass**.
- Use existing SQL Server schema and do not alter it for dashboard-only projections: **Pass**.
- Preserve existing profile/discovery routes and API envelope: **Pass**.
- Enforce mentor ownership and response deadline on the server: **Pass with limitation** — there is no production authentication principal yet; dashboard actions use the existing fixed local-demo identity only when explicitly enabled, and remain unavailable by default.
- Do not let acceptance create payment, subscription, escrow, or workspace state: **Pass**.
- Use existing design tokens, accessible controls, and responsive behavior; demonstrate the reusable metric card in the showcase: **Pass**.
- Do not store/log real database credentials: **Pass**.
- Treat a database failure as a failed operation and return an explicit retryable error: **Pass**.

## Research Decisions

See [research.md](./research.md). Key domain decisions:

1. Use the existing payment commission snapshot and successful refund rows for net earnings; compute per successful payment, then sum, rather than applying today's global commission to historical activity.
2. Treat request acceptance as approval only. The mentee's separate checkout flow creates a pending payment after acceptance.
3. Build cancellation/refund notices as read-only projections from existing request, subscription, payment, and refund data because the 31-table schema has no notification table.
4. HikariCP connection timeout, keepalive, and max-lifetime settings are made explicit at conservative defaults; they cannot repair an unavailable SQL Server or invalid credentials. Port 1433 had no listening process during initial inspection.

## Architecture & API

- Keep mentor-specific code in `vn.happyprogramming.mentor`.
- Add a dashboard application service and narrow repository projections for earnings, rating, incoming requests, and recent cancellation/refund events.
- Reuse the existing server-side mentor demo identity and active-account checks. Do not accept `mentorId` from the browser. Do not present the demo switch as production authentication.
- Add routes to the existing mentor API controller so current error-envelope behavior remains consistent:
  - `GET /api/mentors/me/dashboard`: one `ApiResponse` containing `summary`, `incomingRequests`, and `systemNotices`.
  - `PUT /api/mentors/me/requests/{requestId}/decision`: accept `{ "decision": "ACCEPTED" | "REJECTED" }`; atomically change only an owned, unexpired `PENDING` row and set `responded_at`.
- Include full learning goals and only the linked offering's current name in the dashboard request DTO; the table shows a bounded goal summary and its Details action opens an accessible dialog using the already-loaded details. Do not show price or imply the current offering name is the immutable request-time snapshot because the `offer_snapshot` JSON shape is undocumented.
- Return an opaque conflict for any request decision that updates zero rows, avoiding disclosure of other mentors' request IDs.
- Use existing `ApiResponse`; map database availability failures to a generic retryable 503 without exposing SQL/vendor details.

## Data & Financial Rules

- Net earnings are lifetime-to-date. For each `SUCCEEDED` payment belonging to the mentor, sum successful refund amounts for that payment, calculate `(payment amount - successful refunds) * (1 - commission_rate_snapshot / 100)`, round to currency minor units per payment, then sum. Never use the current global rate in place of a payment snapshot.
- The payment's mentor is resolved through its single schema-approved target: mentorship request, subscription, or booking. VND is the current product currency; no FX conversion is introduced.
- Pending count includes persisted `PENDING` rows; overdue rows remain visible as elapsed until the expiry job changes state, but the decision action is disabled and the server will not transition them.
- Average rating includes reviews with `visibility_status = 'PUBLISHED'` associated with the mentor's subscriptions or bookings; hidden and flagged reviews are excluded. No eligible reviews returns a null/empty average and a zero count.
- Recent notices are read-only projections of cancelled mentorship requests, cancelled subscriptions, and the current state of associated refunds, newest first and bounded to 10. Use cancellation time for cancellations and refund `requested_at` for refund summaries; include `completed_at` only as the successful completion time. Do not claim to preserve refund status-change history.
- Request transition uses a conditional write requiring mentor ownership, `status = 'PENDING'`, and `response_deadline >= SYSUTCDATETIME()`. It changes only request state, `responded_at`, and `updated_at`.

## Connection Configuration

- Preserve the current local SQL Server URL, `sa` username default, SQLServerDialect, `ddl-auto=none`, and environment-only password.
- Make Hikari `connection-timeout`, `keepalive-time`, and `max-lifetime` explicit at conservative values without changing pool size or adding SQL Server retry parameters without evidence.
- Do not set `initialization-fail-timeout=0`, disable validation, or swallow acquisition errors: startup must still fail clearly when a mandatory datasource cannot be reached.
- Do not add a connection-test query when the SQL Server driver provides JDBC 4 `Connection.isValid`.
- A successful Maven build is not evidence that SQL Server connectivity works; inspect the deepest nested SQL exception and rerun DB-backed tests only after port 1433, database, and credentials are available.

## Project Structure

### Feature Documentation

```text
specs/002-mentor-dashboard-overview/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/mentor-dashboard-api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
backend/src/main/java/vn/happyprogramming/mentor/
├── MentorController.java
├── MentorDashboardService.java
├── MentorDashboardRepository.java
├── MentorshipRequestRepository.java
├── MentorshipRequest.java
├── MentorDashboardResponse.java
├── MentorDashboardSummary.java
├── MentorDashboardRequest.java
├── MentorSystemNotice.java
└── MentorRequestDecisionRequest.java

backend/src/test/java/vn/happyprogramming/mentor/
├── MentorDashboardServiceTest.java
└── MentorDashboardControllerTest.java

frontend/src/
├── components/mentor/DashboardMetricCard.js
├── pages/MentorDashboardPage.js
├── services/mentorDashboardService.js
├── pages/ComponentShowcasePage.js
├── components/layout/Header.js
└── main.js
```

## Verification Plan

1. Run focused backend tests for mentor dashboard business logic and HTTP contracts using mocked repositories; verify failure, cross-owner, deadline, idempotency, summary, notice, and response-envelope cases.
2. Run SQL Server-gated repository/transition checks when the required local SQL Server, `DB_PASSWORD`, and active `HPMS_MENTOR_TEST_USER_ID` are configured.
3. Run `mvn -f backend/pom.xml test` when datasource requirements permit; do not report database-backed behavior verified if those tests are skipped.
4. Run `npm run build` and the dashboard-focused `npm test` suite using Node.js's built-in test runner.
5. Run browser checks with mocked API responses at 320px, 768px, and 1440px; cover loading/error/empty/success, request details and decision controls, keyboard focus, and overflow.
6. Run `git diff --check` and inspect scoped diffs without disturbing existing unrelated modifications.

## Risks & Compatibility

- The generic `Could not open JPA EntityManager for transaction` is a wrapper, not a root cause. The observed absence of a local listener on port 1433 means the database must be started before a successful transaction can be verified.
- The feature cannot safely serve real users until application authentication provides a trusted mentor principal. The existing fixed demo identity is default-off and local-only.
- The schema has no system notification table. The dashboard will show current persisted cancellation/refund facts, not deliver push notifications or preserve a separate event history.
- A later currency expansion requires per-currency totals or an FX policy before aggregating multiple currencies.
- Exact UC24/UC26 wireframe source was not present in the repository; the layout follows the elements specified in the user request and the current showcase.

## Complexity Tracking

No constitution violations requiring a complexity exception.
