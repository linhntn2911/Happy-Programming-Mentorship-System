# Feature Specification: Paid Mentorship Workspace

## Goal

After HappyProgramming verifies a SePay payment for a monthly subscription or one-off booking, the assigned mentee and mentor enter one private workspace for their relationship. Monthly plans and one-off sessions remain separate engagements inside that workspace while messages and files are shared.

## User stories

### US-01 — Open an activated workspace

As the paid mentee or assigned mentor, I can list and open my active mentorship workspaces so that I can continue the engagement after payment.

Acceptance criteria:

- A workspace is identified by the approved conversation for one mentor–mentee pair, never by an individual subscription or booking.
- A workspace is visible when the pair has a `TRIALING`/`ACTIVE` monthly subscription or a paid one-off booking in `CONFIRMED`, `COMPLETED`, `NO_SHOW_REVIEW`, or `NO_SHOW` state.
- The caller must be the conversation's `mentee_id` or `mentor_id`.
- Mentor acceptance without a verified payment never grants workspace access.
- The workspace shows one optional active monthly plan plus the pair's paid one-off sessions, including their independent schedule, status, price, and participant count.
- A confirmed one-off session remains in the upcoming section only until its `end_at`. After that instant it is completed automatically, removed from upcoming sessions, and retained under a collapsed past-session history.
- Buying another service from the same mentor reuses the existing workspace and conversation.
- A user with no active workspace sees an honest empty state.
- Opening Mentorships first shows the user's active mentor/mentee list; conversation detail opens only after a selection or a direct checkout/application link.
- The workspace uses a responsive messenger layout: mentorship conversations are listed together, the selected conversation remains visible beside its message history on larger screens, and mentorship context remains available without leaving the conversation.

### US-02 — Exchange private messages

As a workspace member, I can send text messages and view the latest conversation history.

Acceptance criteria:

- Message writes require an authenticated workspace member, an approved conversation provisioned by verified settlement, and at least one qualifying monthly or one-off engagement.
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

### US-04 — Keep engagement contexts separate inside one conversation

As a mentor or mentee, I can see monthly mentorship and one-off sessions in the same workspace without confusing their schedules, payments, cancellations, or reviews.

Acceptance criteria:

- The workspace list contains at most one entry for each mentor–mentee pair.
- Monthly cancellation does not cancel one-off bookings, and one-off cancellation does not change the monthly subscription.
- Reviews and operational actions continue to target the exact subscription or booking.
- Completed one-off records are never deleted from the workspace history because reviews, refunds, disputes, and financial audit continue to reference the booking.
- A one-off-only customer receives the same shared conversation after verified payment.
- A repeated settlement or concurrent purchase cannot create a duplicate conversation.

## Out of scope

- Video calling, Google Calendar, or meeting-link provisioning.
- Per-message read receipts, typing indicators, WebSockets, message editing, deletion, and moderation workflow UI.
- Combining monthly and one-off billing, cancellation, or review records.

## Security requirements

- Every list, detail, message, upload, and download operation performs server-side membership and subscription-state checks.
- The API never returns another workspace's messages or personal context.
- Mutation endpoints retain Spring Security CSRF protection.
- Only the authenticated SePay webhook settlement may provision or reuse the approved conversation and paid engagement used by this feature.

## Success criteria

- A settled monthly subscription or one-off booking is accessible to both assigned users from one relationship workspace.
- A user with monthly and one-off services from the same mentor sees one workspace entry.
- An unrelated authenticated user receives `403` for workspace detail and message writes.
- A request that is merely `ACCEPTED` but unpaid has no accessible workspace.
- Reusing the same client message key returns the existing message without creating a duplicate.
