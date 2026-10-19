# Tasks: Mentee Dispute Submission

- [x] T001 Define mentee dispute API contract and persistence model.
- [x] T002 Add the dispute migration and package it with Flyway.
- [x] T003 Implement authorized mentee dispute intake, evidence storage, tracking, and download APIs.
- [x] T004 Block mentor earning release for active disputes.
- [x] T005 Add My Disputes route, history, filters, submission modal, previews, and detail modal.
- [x] T006 Add focused backend and frontend tests.
- [x] T007 Run affected-app verification and record the live-database suite limitation.

## Verification record

- Backend compile passed.
- `DisputeServiceTest`, `MentorWalletServiceTest`, and `BookingLifecycleRepositoryTest`: 10 tests passed.
- Frontend suite: 103 tests passed.
- Frontend production build passed.
- The complete backend suite was started but could not progress past the existing `AuthControllerTest` Spring context because that suite requires the developer SQL Server. No failure was reported by the completed tests.
