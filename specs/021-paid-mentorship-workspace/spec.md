# Feature Specification: Paid Mentorship Workspace

## Goal

After HappyProgramming verifies a SePay payment and activates a monthly subscription, the assigned mentee and mentor can enter one private workspace to review the mentorship context, exchange messages, and share learning files.

## User stories

### US-01 — Open an activated workspace

As the paid mentee or assigned mentor, I can list and open my active mentorship workspaces so that I can continue the engagement after payment.

Acceptance criteria:

- A workspace is visible only when its subscription is `TRIALING` or `ACTIVE`.
- The caller must be the subscription's `mentee_id` or `mentor_id`.
- Mentor acceptance without a verified payment never grants workspace access.
- The workspace shows the partner, package, learning goals, period, and included call/session terms from the accepted snapshot.
- A user with no active workspace sees an honest empty state.
- Opening Mentorships first shows the user's active mentor/mentee list; conversation detail opens only after a selection or a direct checkout/application link.
- The workspace uses a responsive messenger layout: mentorship conversations are listed together, the selected conversation remains visible beside its message history on larger screens, and mentorship context remains available without leaving the conversation.

### US-02 — Exchange private messages

As a workspace member, I can send text messages and view the latest conversation history.

Acceptance criteria:

- Message writes require an authenticated workspace member and an approved conversation provisioned by verified settlement.
- The composer sends `TEXT` messages without requiring a message-type selector; historical `CODE` messages remain readable.
- Blank messages and messages longer than 10,000 characters are rejected.
- Each client message key is idempotent per sender.
- Message bodies are rendered as text, never trusted HTML.
- Workspace refresh/polling is observational and cannot activate a subscription.
- The global header message icon shows the total unread count, and each mentorship card shows its own unread count.
- Opening a conversation marks its latest visible messages as read; messages in other mentorships remain unread.
- The message composer and file action remain attached to the selected conversation while switching between mentorships.
- Users can search the latest loaded conversation history by message text, sender, filename, or code language without exposing messages from another workspace.
- The conversation list displays the server-provided unread count, and an opened conversation identifies the boundary of incoming messages that were unread when it was opened before updating the role-specific read pointer.

### US-03 — Share learning files

As a workspace member, I can upload and download learning files inside the private conversation.

Acceptance criteria:

- Files are limited to 10 MB and an allowlist of documents, archives, text, spreadsheets, presentations, and images.
- File metadata and bytes are persisted through a new additive migration; published migrations remain unchanged.
- Only the assigned mentor or mentee of an active subscription can upload or download the attachment.
- Executable and unsupported content types are rejected.

## Out of scope

- Video calling, Google Calendar, or meeting-link provisioning.
- Per-message read receipts, typing indicators, WebSockets, message editing, deletion, and moderation workflow UI.
- One-off booking workspaces.

## Security requirements

- Every list, detail, message, upload, and download operation performs server-side membership and subscription-state checks.
- The API never returns another workspace's messages or personal context.
- Mutation endpoints retain Spring Security CSRF protection.
- Only the authenticated SePay webhook settlement may provision the approved conversation and active subscription used by this feature.

## Success criteria

- A settled monthly subscription is accessible to both assigned users from the web client.
- An unrelated authenticated user receives `403` for workspace detail and message writes.
- A request that is merely `ACCEPTED` but unpaid has no accessible workspace.
- Reusing the same client message key returns the existing message without creating a duplicate.
