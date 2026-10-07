# Data Model: Mentor Dashboard Overview

This feature reads and conditionally updates existing schema records. It adds no database table or migration.

## Mentor Dashboard Summary

| Field | Source/Rule |
|---|---|
| netEarnings | Sum of successful payment amounts net of successful refunds and the immutable commission snapshot, per payment |
| currency | VND, the current product currency; no foreign-exchange conversion |
| pendingInvitations | Count of this mentor's persisted `PENDING` mentorship requests |
| averageRating | Average rating for this mentor's `visibility_status = PUBLISHED` reviews; null when none exist |
| reviewCount | Count used to contextualize the average |

## Incoming Mentorship Request

| Field | Source/Rule |
|---|---|
| id | `mentorship_requests.id`; used in the path only |
| menteeName | `users.full_name` joined by `mentee_id` |
| packageName | Current `service_offerings.name` for the linked service, shown as a label only |
| learningGoals | `mentorship_requests.learning_goals`; full value used in Details dialog |
| learningGoalsSummary | Bounded presentation derived from `learningGoals` |
| status | `mentorship_requests.status`; list contains `PENDING` |
| submittedAt | UTC `submitted_at` |
| responseDeadline | UTC `response_deadline`; drives SLA timer and server-side deadline predicate |

## Decision Request

| Field | Rule |
|---|---|
| decision | Required enum-like string `ACCEPTED` or `REJECTED`; no arbitrary status accepted |
| requestId | Positive path identifier; must be owned by current mentor, pending, and unexpired |

On successful decision the database updates only `status`, `responded_at`, and `updated_at`. Request identity, terms, ownership, offer snapshot, and payment records are unchanged.

## System Notice

| Field | Source/Rule |
|---|---|
| id | Stable composed key from notice kind and source row |
| type | `CANCELLATION` or `REFUND` |
| requestId | Related mentorship request ID when the source payment/request has one |
| menteeName | Related user display name, scoped through the mentor's records |
| status | Request/subscription cancellation state or persisted refund status |
| occurredAt | `cancelled_at` for cancellations or `refunds.requested_at` for refund summaries, normalized to UTC |
| completedAt | Nullable `refunds.completed_at`; populated only for successful refunds |
| message | Safe, concise presentation text; not a free-form sensitive cancellation reason |

Notices are read-only, newest-first by `occurredAt`, and limited to 10. They represent current refund state, not a history of refund status changes. The source of truth remains the related existing tables.

## Source Relationships

- `mentorship_requests.mentor_id` and `.mentee_id` identify an incoming request and its owner.
- `mentorship_requests.service_id` with mentor/service type links the selected `service_offerings` row.
- `mentorship_requests.offer_snapshot` is immutable but its JSON shape is undocumented; this feature does not parse it or present the mutable current offering name as locked request terms.
- A payment can target one request, subscription, or booking. Each target links the payment to its mentor.
- Successful refunds reference payment IDs; refund totals are aggregated by payment before applying commission.
- Reviews target exactly one booking or subscription; both relationships expose the owning mentor.
- Only `visibility_status = 'PUBLISHED'` reviews contribute to the average; `HIDDEN` and `FLAGGED` reviews do not.

All decision and repository operations must scope by the server-resolved mentor identity.
