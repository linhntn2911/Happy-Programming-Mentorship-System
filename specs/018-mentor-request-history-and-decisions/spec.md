# Mentor Request History and Decisions

## User outcome
Mentors can review current and past mentee applications without losing the stored record. A decision is only reported as successful after the backend persists it. Mentees can pay only after the same application is actually accepted by the backend.

## Requirements
- Accepting, rejecting, expiring, or cancelling a request updates its status and timestamps on the existing request row; the workflow must not delete the application.
- Mentors can retrieve every request associated with their account, including pending, accepted, rejected, expired, and cancelled requests.
- The mentor request page distinguishes requests awaiting a decision from historical requests and shows the persisted status.
- A new pending request receives a UTC response deadline exactly 48 hours after its UTC submission time, independent of the JVM time zone.
- Accept/reject details use the shared application modal presentation and preserve accessible close, focus, and action behavior.
- The UI must not hide or mark a request processed when the decision API fails. It shows the error and allows retry.
- Mentee payment eligibility is based on the persisted `ACCEPTED` state and remains unavailable for a pending or declined request.

## Acceptance scenarios
1. A mentor can find an accepted or rejected request in history after it leaves the pending queue.
2. The request keeps the same ID and package snapshot across a decision; only its lifecycle fields change.
3. If a decision request fails, the request remains visible as pending and no success message is shown.
4. After a successful accept, the mentee's application list shows Accepted and exposes the payment action for that same request ID.
5. A pending application never exposes payment, and a failed payment configuration does not change its application status.
6. The mentor request countdown agrees with the stored UTC submission and deadline and cannot extend the 48-hour response window due to timezone conversion.

## Scope boundary
Use the existing `mentorship_requests` records and lifecycle fields. A focused Flyway data correction adjusts only pending rows with impossible future submission timestamps caused by the prior UTC/JDBC mismatch. It preserves request identity and history, and restores the lifecycle trigger in the same transaction. Payment provider setup and settlement remain governed by `specs/016-vnpay-mentorship-checkout/`.
