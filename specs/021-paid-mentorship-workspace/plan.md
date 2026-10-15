# Implementation Plan: Paid Mentorship Workspace

## Architecture

- Reuse `subscriptions`, `mentorship_requests`, `conversations`, `messages`, `attachments`, and `files`; add an append-only migration for generic file bytes.
- Add `MentorshipWorkspaceController` under `/api/mentorship-workspaces`.
- Add `MentorshipWorkspaceService` for authorization, validation, transaction boundaries, and DTO composition.
- Add `MentorshipWorkspaceRepository` for SQL Server reads and idempotent message persistence.
- Add DTOs for summaries, details, messages, downloads, and send-message input; JPA entities are not exposed.
- Add a shared frontend workspace page and service because both mentor and mentee use the same API and conversation. Present summaries and detail in a responsive messenger layout with a conversation rail, selected message panel, and mentorship-context panel; collapse back to list/detail navigation on smaller screens.
- Render the mentor view inside the established `MentorLayout`; render the mentee view with the public account header.
- Link paid checkout and paid application states directly to their workspace while the sidebar Mentorships route opens the active participant list first.

## Authorization boundary

The repository query requires the current user to match `subscriptions.mentor_id` or `subscriptions.mentee_id` and requires `subscriptions.status IN ('TRIALING','ACTIVE')`. The service repeats the membership decision from the returned access record before any write. Conversation status must be `APPROVED`.

## Reliability

- The client supplies a stable `clientMessageKey` for retry safety.
- The unique database constraint `(sender_id, client_message_key)` remains the final duplicate guard.
- The page polls the selected workspace for new messages and stops polling when unmounted.
- The latest 100 messages are returned in chronological order to bound response size.
- Search is client-side and limited to those latest loaded messages. The unread divider is derived from the server-provided conversation unread count and incoming-message order; successful opening still advances the existing role-specific last-read pointer.

## Tradeoffs

HTTP polling is used for the first release because the project has no WebSocket infrastructure. Workspace files are stored in SQL Server for this project-sized deployment, limited to 10 MB, and downloaded only through an authorized endpoint.

## Verification

- Backend controller/service tests cover list/detail, membership rejection, message validation, and idempotent writes.
- Frontend tests cover CSRF-protected sending and workspace markup states.
- Run the backend test suite plus frontend tests and production build because the change crosses routing, authorization, persistence, and both applications.
