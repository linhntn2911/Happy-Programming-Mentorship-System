# Implementation Plan: Paid Mentorship Workspace

## Architecture

- Reuse `subscriptions`, `bookings`, `mentorship_requests`, `conversations`, `messages`, `attachments`, and `files`. No schema change is required because `UQ_conversations_pair` already enforces one conversation per mentor–mentee pair; an idempotent data migration provisions conversations for one-off bookings settled before this feature.
- Add `MentorshipWorkspaceController` under `/api/mentorship-workspaces`.
- Add `MentorshipWorkspaceService` for authorization, validation, transaction boundaries, and DTO composition.
- Add `MentorshipWorkspaceRepository` for SQL Server reads and idempotent message persistence.
- Use `conversationId` as the public workspace identifier. Keep nullable monthly fields for compatibility and add one-off booking summaries to workspace detail; JPA entities are not exposed.
- Add a shared frontend workspace page and service because both mentor and mentee use the same API and conversation. Present summaries and detail in a responsive messenger layout with a conversation rail, selected message panel, and mentorship-context panel; collapse back to list/detail navigation on smaller screens.
- Render the mentor view inside the established `MentorLayout`; render the mentee view with the public account header.
- Link verified monthly and one-off checkout states to the same relationship workspace while the sidebar Mentorships route opens the participant list first.

## Authorization boundary

The repository query starts from an `APPROVED` conversation, requires the current user to match its mentor or mentee, and requires either an active monthly subscription or a paid one-off booking. The service repeats the membership decision before any write. Settlement inserts the conversation with an atomic `IF NOT EXISTS` guarded by the existing unique pair constraint.

## Reliability

- The client supplies a stable `clientMessageKey` for retry safety.
- The unique database constraint `(sender_id, client_message_key)` remains the final duplicate guard.
- The page polls the selected workspace for new messages and stops polling when unmounted.
- The latest 100 messages are returned in chronological order to bound response size.
- Search is client-side and limited to those latest loaded messages. The unread divider is derived from the server-provided conversation unread count and incoming-message order; successful opening still advances the existing role-specific last-read pointer.

## Tradeoffs

HTTP polling is used for the first release because the project has no WebSocket infrastructure. Workspace files are stored in SQL Server for this project-sized deployment, limited to 10 MB, and downloaded only through an authorized endpoint.

Monthly subscriptions and one-off bookings are read as independent engagement contexts. Cancelling or reviewing one context never mutates the other. When multiple active monthly records exist, the most recently activated one supplies the monthly summary while the conversation remains singular.

One-off completion is time driven. An idempotent scheduled job changes ended `CONFIRMED` one-off bookings to `COMPLETED`, sets `completed_at` from the authoritative booking end time, and leaves `completed_by` empty to identify automatic completion. The workspace UI also classifies an ended confirmed booking as past immediately, so a scheduler interval cannot leave an expired card in the upcoming section. Past sessions are collapsed by default and remain available as immutable history.

Monthly lifecycle is also time driven. A separate idempotent scheduled job first ends `TRIALING`, `ACTIVE`, or `PAST_DUE` subscriptions whose paid period has elapsed, then activates the remaining `TRIALING` subscriptions whose trial has elapsed. Ordering the updates this way prevents an overdue trial from briefly becoming active. `DISPUTED` and terminal subscriptions are excluded so mediation and cancellation decisions remain authoritative.

## Verification

- Backend controller/service tests cover one-row-per-conversation aggregation, one-off-only access, mixed monthly/one-off detail, membership rejection, message validation, and idempotent writes.
- Frontend tests cover CSRF-protected sending, conversation identifiers, mixed engagement rendering, and workspace markup states.
- Focused scheduler/repository tests cover the idempotent ended-booking transition; frontend tests cover upcoming/history separation at the exact end-time boundary.
- Run the backend test suite plus frontend tests and production build because the change crosses routing, authorization, persistence, and both applications.
