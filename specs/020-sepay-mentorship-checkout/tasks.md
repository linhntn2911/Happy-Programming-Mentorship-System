# Tasks: SePay Mentorship QR Checkout

- [x] Task 1: Add SePay configuration properties and DTOs (`SepayWebhookPayload`, `SepayWebhookResponse`, update `CheckoutResponse` and `CheckoutInfoDto`).
- [x] Task 2: Implement `SepayPaymentService` with payment initiation, SePay QR URL generation, and atomic idempotent webhook settlement.
- [x] Task 3: Expose `POST /api/payments/sepay/webhook` in `PaymentController` and configure security & CSRF exclusions in `SecurityConfig`.
- [x] Task 4: Connect `MentorshipRequestController` checkout initiation to `SepayPaymentService` (with VNPay fallback if configured) and update checkout info endpoint.
- [x] Task 5: Update frontend `CheckoutPage.js` to render the on-page SePay QR code, bank transfer details with copy buttons, countdown timer, and 3-second auto-polling.
- [x] Task 6: Add backend unit tests and frontend tests for the SePay payment flow, run test suites, and verify build.

## Verification
- Frontend: `npm test` (50 passed, 0 failures) and `npm run build` succeeded cleanly.
- Backend: `mvnw.cmd test` (145 tests passed, 0 failures, 5 skipped) completed with `BUILD SUCCESS`.

## Integration review 2026-10-12
The earlier verification above is upstream evidence, not current local verification. See review-20261012.md for local results and confirmed gaps.
- [x] Make webhook authentication fail closed without a configured key and remove the fixed runtime fallback.
- [x] Require complete inbound account/transaction identity validation and define late/cancelled/cross-provider settlement handling.
- [x] Correct wallet available/reservation calculations to subtract already-paid amounts; add payout regression coverage.
- [x] Verify settlement/idempotency/refund/release/payout accounting on a disposable migrated SQL Server database.
- [x] Resolve the three current backend suite failures and align Admin reporting with the documented ledger/rounding policy.

## One-off checkout extension 2026-10-15

- [x] Permit an owned active one-off slot hold to create an immediately payable order without mentor approval.
- [x] Charge the immutable one-off total derived from session and participant quantities.
- [x] Bound payment expiry by the selected slot-hold expiry.
- [x] Convert the hold and create confirmed one-off bookings only from verified webhook settlement.
- [x] Preserve the monthly approval-first subscription path.
