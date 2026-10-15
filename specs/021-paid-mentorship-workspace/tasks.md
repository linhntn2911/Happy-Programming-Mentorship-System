# Tasks: Paid Mentorship Workspace

- [x] T1 Define API contract and DTOs for workspace summaries, details, and messages.
- [x] T2 Implement repository queries scoped to active subscription membership.
- [x] T3 Implement service validation, authorization, and idempotent message creation.
- [x] T4 Expose authenticated workspace endpoints.
- [x] T5 Add the shared mentor/mentee workspace page, routing, navigation, loading, empty, error, and polling states.
- [x] T6 Link verified checkout and paid applications to the workspace.
- [x] T7 Add focused backend/frontend tests and run verification.
- [x] T8 Reconcile implementation, contract, baseline spec, and task state.
- [x] T9 Replace automatic conversation opening with an active mentor/mentee selection list.
- [x] T10 Remove the message-type selector and add authorized 10 MB workspace file upload/download.
- [x] T11 Add role-specific unread tracking, per-mentorship badges, and a polling header message indicator.
- [x] T12 Redesign the shared workspace as a responsive messenger layout while preserving conversation selection, unread tracking, file sharing, and mentorship context.
- [x] T13 Add loaded-history message search and an unread-message boundary backed by the existing role-specific unread count.

## Verification

- Backend: `mvn test` — 165 tests, 0 failures, 0 errors, 6 skipped.
- Frontend: `npm test` — 79 tests, 0 failures.
- Frontend production build: `npm run build` — passed.
