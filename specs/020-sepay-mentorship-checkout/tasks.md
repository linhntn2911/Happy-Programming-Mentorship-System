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
