# Feature Specification: Mentor Dashboard Overview

**Feature Branch**: `002-mentor-dashboard-overview`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User request to implement the Mentor Dashboard Overview (UC24/UC26), including earnings, pending invitations with a 48-hour response window, average rating, request decisions, and cancellation/refund notices, and to harden local SQL Server persistence configuration.

## User Scenarios & Testing

### User Story 1 - Review mentor overview (Priority: P1)

As a mentor, I want to see my net earnings, pending invitations, and average rating together so I can understand my current mentorship activity.

**Why this priority**: These summary metrics provide the primary value of the dashboard and help mentors decide what needs attention.

**Independent Test**: Load the dashboard for a mentor with seeded payments, pending requests, and published reviews; verify each summary matches only that mentor's records and empty values display clearly.

**Acceptance Scenarios**:

1. **Given** a mentor with successful payments, recorded commission snapshots, successful refunds, pending requests, and published reviews, **When** the mentor opens the dashboard, **Then** the dashboard shows their net earnings, current pending request count, and average published rating.
2. **Given** the mentor has no earnings, pending requests, or published reviews, **When** the dashboard loads, **Then** zero-value metrics and an explicit no-review state are shown without errors.
3. **Given** the persistence service is unavailable, **When** the dashboard loads, **Then** the UI reports a retryable error and does not show fabricated success data.

---

### User Story 2 - Respond to incoming mentorship requests (Priority: P1)

As a mentor, I want to review incoming mentorship requests and accept or reject them within the response window so mentees can continue or find another mentor.

**Why this priority**: Responding to requests is a blocking step in the mentee's mentorship and payment journey.

**Independent Test**: Seed a pending request for the mentor; verify the details, SLA deadline, and that Accept or Reject persists the corresponding state exactly once.

**Acceptance Scenarios**:

1. **Given** an unexpired pending request owned by the current mentor, **When** the mentor accepts it, **Then** its state becomes `ACCEPTED`, its response time is recorded, and the mentee may proceed to the existing payment step.
2. **Given** an unexpired pending request owned by the current mentor, **When** the mentor rejects it, **Then** its state becomes `REJECTED` and its response time is recorded.
3. **Given** a request that is expired, already decided, or owned by another mentor, **When** a decision is submitted, **Then** no request is changed and the user receives a clear conflict or not-found response.
4. **Given** the mentor opens a request, **When** they select Details, **Then** the dashboard displays its learning goals and relevant request/package details without exposing unrelated account data.
5. **Given** a mentor accepts a request, **When** the update succeeds, **Then** no payment, subscription, escrow entry, or workspace is created by the acceptance action itself.

---

### User Story 3 - See cancellation and refund notices (Priority: P2)

As a mentor, I want to see recent cancellations and current refund states related to my mentorships so I can stay informed about changes that affect my work and earnings.

**Why this priority**: These events provide important operational context but do not block request review.

**Independent Test**: Seed cancelled mentorship requests and refunds in multiple states for the mentor; verify only related recent events are displayed and unrelated mentors' data is excluded.

**Acceptance Scenarios**:

1. **Given** the mentor has cancelled requests or associated refunds, **When** the dashboard loads, **Then** it shows a bounded, newest-first list of cancellation records and current refund-state summaries with request context where available.
2. **Given** no matching events exist, **When** the dashboard loads, **Then** it shows a clear empty state.
3. **Given** a cancellation or refund record changes, **When** the mentor reloads the dashboard, **Then** the notice reflects the persisted database state.

### Edge Cases

- The 48-hour deadline is evaluated using UTC persisted timestamps; requests past the deadline cannot be accepted or rejected even if a background expiry job has not yet run.
- Concurrent accept/reject attempts must result in no more than one successful state transition.
- Duplicate clicks or network retries must not create duplicate financial, payment, or subscription records.
- Missing or malformed request/package data must not break the complete dashboard response.
- Database connection failures must be surfaced as retryable service errors; they must not be reported as successful decisions.
- If reviews are hidden or flagged, they are excluded from the average rating.
- Cancellation and refund notices must not disclose another mentor's or mentee's private data.

## Requirements

### Functional Requirements

- **FR-001**: The dashboard MUST show net earnings, pending invitation count, and average rating for the current mentor identity resolved by the server.
- **FR-002**: Lifetime net earnings MUST sum each successful payment's amount after successful refunds, then apply that payment's immutable commission-rate snapshot; it MUST be scoped to the mentor.
- **FR-003**: Pending invitations MUST include only requests in `PENDING` state owned by the mentor and MUST show their submission/deadline context for the 48-hour response window.
- **FR-004**: Each request row MUST show mentee name, package, learning-goal summary, SLA time remaining, and Details, Accept, and Reject actions.
- **FR-005**: A mentor MUST be able to inspect the full learning goals and the linked offering's package name for an incoming request; the displayed name MUST NOT be described as an immutable request-time package snapshot.
- **FR-006**: A mentor MUST be able to accept or reject only an unexpired pending request belonging to that mentor; each successful decision MUST persist the matching state and response timestamp.
- **FR-007**: Accepting a request MUST leave payment initiation to the existing mentee checkout flow and MUST NOT itself create a payment, subscription, escrow record, or workspace.
- **FR-008**: Average rating MUST be calculated only from reviews with `visibility_status = PUBLISHED` associated with the mentor; hidden and flagged reviews are excluded, and an explicit empty state MUST be shown when no eligible reviews exist.
- **FR-009**: The dashboard MUST show recent cancelled requests and the current states of associated refunds for the mentor without introducing a second, unsynchronized event record or implying that every state transition is retained.
- **FR-010**: Every dashboard read and decision MUST be restricted to the current mentor's own records; a client-supplied mentor ID MUST NOT control ownership.
- **FR-011**: Database and API failures MUST be reported explicitly, and failed request decisions MUST leave request state unchanged.
- **FR-012**: The dashboard MUST remain usable at mobile, tablet, and desktop widths with keyboard-accessible controls and visible focus.

### Key Entities

- **Mentorship Request**: A mentee's application to a mentor, including package, learning goals, state, submission time, response deadline, and response time.
- **Service Offering**: The currently linked package label for the mentee's request; its name may change and is not treated as an immutable request-time term.
- **Mentor Earnings**: Successful payments associated with the mentor, their immutable commission snapshots, and any successful refunds.
- **Review**: A mentee's rating and comment associated with a completed booking or eligible mentorship subscription.
- **Cancellation/Refund Notice**: A read-only dashboard representation derived from the mentor's cancelled requests and their persisted refund records.
- **Mentor Identity**: The trusted server-side mentor context used to scope all dashboard data and decisions; local demo configuration is the temporary default-off fallback until authentication exists.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For a valid mentor with available data, all three summary metrics and the incoming request list are displayed after one successful dashboard load.
- **SC-002**: Every successful decision changes exactly one eligible request to the selected state and records its response time; no payment or subscription is created by that decision.
- **SC-003**: Requests past their response deadline or belonging to another mentor have a 0% successful decision rate.
- **SC-004**: The 10 most recent cancellation/refund summaries for the mentor appear newest first by their persisted cancellation/request timestamps, and no summary belonging only to another mentor is returned.
- **SC-005**: Dashboard content and actions remain operable at 320px mobile, 768px tablet, and 1440px desktop viewport widths without horizontal overflow.
- **SC-006**: When SQL Server is unreachable or a request fails, the UI shows an error state and never indicates that data was saved successfully.

## Assumptions

- Average rating is a lifetime-to-date dashboard total unless a later product requirement defines a period filter.
- Net earnings are lifetime-to-date: for each successful mentor payment, subtract its successful refunds from the payment amount, then subtract the commission computed from that payment's immutable rate snapshot, following US-09.
- The existing database schema is authoritative; no notification table or refund status history is present, so notices are derived read-only from cancellation and refund records and limited to the latest 10 summaries.
- Acceptance enables the mentee's existing payment step only; payment initiation remains a separate mentee action as specified by the approval-first state machine.
- The repository contains no separate UC24/UC26 wireframe artifact. The requested metrics, table columns, actions, and notices in the user request define the initial layout, implemented with the existing purple/white design system.
- The `offer_snapshot` JSON shape is undocumented. This feature displays only the linked current offering name, omits price/terms, and does not represent that name as an immutable request-time snapshot.
- Refund notices show the current persisted refund status, ordered by `requested_at`; they are summaries rather than a history of status-change events. A successful refund may also show its `completed_at`.
- Real request ownership requires an authenticated principal. Until authentication is implemented, local demonstration access may reuse the existing server-configured mentor identity, default-off and never supplied by the client.
- The SQL Server database must be running and credentials valid. Connection-pool tuning can reduce stale-connection and recovery issues but cannot make an offline database or invalid credentials available.
