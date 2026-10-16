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
- [x] T14 Change workspace identity and authorization from subscription to approved conversation with a qualifying engagement.
- [x] T15 Aggregate the newest active monthly plan and all paid one-off bookings without duplicating a mentor–mentee pair.
- [x] T16 Provision or reuse the conversation after either monthly or one-off verified SePay settlement.
- [x] T17 Update shared workspace API DTOs, client service, routes, list cards, and detail context for mixed engagements.
- [x] T18 Add focused backend/frontend regression coverage and run cross-application verification.
- [x] T19 Reconcile contract, implementation, baseline specification, and task state.
- [x] T20 Add an idempotent scheduled lifecycle transition for ended confirmed one-off bookings.
- [x] T21 Separate upcoming one-off sessions from collapsed past-session history in the shared workspace.
- [x] T22 Add focused backend and frontend regression tests for the end-time boundary.
- [x] T23 Reconcile workspace contract, baseline specification, implementation, and verification evidence.

## Verification

- Backend: `mvn test` — 165 tests, 0 failures, 0 errors, 6 skipped.
- Frontend: `npm test` — 79 tests, 0 failures.
- Frontend production build: `npm run build` — passed.
- Unified relationship workspace: frontend `npm test` — 91 tests passed; `npm run build` — passed; SePay service — 10 tests passed; SQL Server migration V20 and the conversation aggregation query completed successfully against the development database. Mockito-based workspace service/controller tests compile, but execution is blocked in this Windows environment by JVM attach pipe denial before assertions run.
- Automatic one-off completion: focused backend tests — 2 passed; frontend `npm test` — 92 passed; frontend `npm run build` — passed. The full backend suite was attempted but produced no further output for more than 60 seconds while starting `AuthControllerTest` and was stopped; the changed backend sources and focused tests compiled and passed.
