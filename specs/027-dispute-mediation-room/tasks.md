# Tasks: Mentee Dispute Submission

- [x] T001 Define mentee dispute API contract and persistence model.
- [x] T002 Add the dispute migration and package it with Flyway.
- [x] T003 Implement authorized mentee dispute intake, evidence storage, tracking, and download APIs.
- [x] T004 Block mentor earning release for active disputes.
- [x] T005 Add My Disputes route, history, filters, submission modal, previews, and detail modal.
- [x] T006 Add focused backend and frontend tests.
- [x] T007 Run affected-app verification and record the live-database suite limitation.
- [x] T008 Specify the 24-hour response and 48-hour resolution deadline alerts.
- [x] T009 Add deadline target queries, idempotent notification service, and scheduled scan.
- [x] T010 Add focused tests for delegation, recipients, resolution SLA alerts, and duplicate prevention.
- [x] T011 Start both dispute clocks at submission and add the resolution deadline migration.
- [x] T012 Enforce Mentor response and Staff decision timing in backend services and frontend screens.
- [x] T013 Notify active Staff before assignment and keep Admin outside deadline alerts.

## Verification record

- Backend compile passed.
- `DisputeServiceTest`, `MentorWalletServiceTest`, and `BookingLifecycleRepositoryTest`: 10 tests passed.
- Frontend suite: 103 tests passed.
- Frontend production build passed.
- The complete backend suite was started but could not progress past the existing `AuthControllerTest` Spring context because that suite requires the developer SQL Server. No failure was reported by the completed tests.
- Deadline alert verification (2026-11-25): `DisputeDeadlineServiceTest` and `DisputeDeadlineAlertJobTest` passed; backend compilation completed successfully. The focused suite covers approaching and overdue response warnings, approaching and overdue resolution warnings, assigned recipients, scheduler delegation, and duplicate prevention.
- Submission-clock verification (2026-11-25): focused backend policy/deadline tests passed, the frontend Node test suite passed 175/175, and the production frontend build and backend package completed successfully.
