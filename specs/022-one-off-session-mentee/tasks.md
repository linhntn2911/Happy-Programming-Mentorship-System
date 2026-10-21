# Tasks

- [x] Reconcile MentorCruise reference elements with HappyProgramming requirements and existing code.
- [x] Add a public active-offerings API without changing the monthly package contract.
- [x] Add one-off session list and detail pages for Mentees.
- [x] Connect the mentor-profile CTA only to real active one-off offerings.
- [x] Add explicit empty and unavailable states without mock slots.
- [x] Disable one-off checkout and show a prominent message when no matching slot is available.
- [x] Return and display the Mentor's optional availability note for each generated Mentee slot.
- [x] Generate offering-specific candidate slots at 10-minute start intervals.
- [x] Reject one-off durations shorter than 10 minutes and prevent overlapping slot holds.
- [x] Create and validate a slot hold when the Mentee continues to checkout.
- [x] Make valid one-off orders immediately payment-eligible without mentor review.
- [x] Migrate request lifecycle constraints and trigger while preserving monthly approval-first behavior.
- [x] Redirect successful one-off order creation directly to SePay checkout.
- [x] Use the immutable one-off total for payment initiation and checkout display.
- [x] Convert the hold into confirmed bookings only after verified SePay settlement.
- [x] Remove waiting-for-mentor copy and update focused tests.
- [x] Verify focused backend and frontend tests and the frontend production build.

## Verification

- Frontend: focused one-off and mentor workspace tests passed.
- Backend: production compile passed after availability and duration validation changes.
- Frontend: Vite production build passed.
- Backend: `MentorPlanControllerTest` passed (7 tests).
- Frontend: full `npm test` passed (86 tests) and Vite production build passed after direct-checkout changes.
- Backend: production and test sources compile; `SepayPaymentServiceTest` passed (8 tests), including one-off total selection.
- Backend full suite was started but the local Spring application context stopped producing output during startup, so full-suite completion remains unverified in this environment.
- No-slot booking state: focused one-off page tests passed (6 tests), and the Vite production build passed.
