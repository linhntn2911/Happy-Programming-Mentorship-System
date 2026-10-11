# Plan: VNPay Mentorship Checkout

## Architecture
- Keep the existing mentee checkout and accepted application navigation.
- `MentorshipRequestService` remains responsible for owner-scoped checkout details, now including latest payment status/expiry and without mock bank data.
- Add a `VnPayPaymentService` for attempt creation and atomic IPN settlement, and an `integration.VnPayGateway` for HMAC-SHA512 URL signing and response signature verification.
- Keep HTTP endpoints in `MentorshipRequestController` for authenticated checkout initiation and `PaymentController` for public gateway IPN/return callbacks.
- Use existing `payments`, `payment_events`, `escrow_ledger_entries`, `subscriptions`, `conversations`, and `system_configs` tables. No schema migration is needed.
- The browser return redirects to the configured frontend route and only triggers a fresh authenticated state read; it never mutates payment state. A verified payment creates an immediately active subscription; no free trial is offered.

## Security and compatibility
- Require authenticated owner identity for checkout details, status, and initiation. Never accept price, request ownership, commission, or success status from the browser.
- Validate VNPay's signed fields, configured merchant code, reference, VND amount in minor units, and both response/transaction status.
- Lock the mentorship request before payment during initiation and settlement. Use DB uniqueness constraints plus payment event deduplication for retries.
- Keep the existing `POST /api/mentorship-requests/{id}/checkout` route, changing it to return `PENDING`, gateway URL, payment ID, amount, and expiry.
- Use environment variables for merchant credentials and URLs. Configure the IPN URL in VNPay's merchant portal; it must be public HTTPS for real callbacks.
- For legacy requests missing their offer snapshot, recover only from the exact linked active monthly offering when `service_offerings.updated_at <= mentorship_requests.submitted_at`; persist the reconstructed immutable snapshot before creating a payment. When that proof is unavailable, expose an unavailable-price state and block payment.

## Validation
- Unit test payment URL signing and callback signature checks.
- Add controller coverage for the pending checkout response and public callback response shape.
- Add frontend tests for pending/failed/succeeded states and redirect to the gateway; build the frontend.
- Run backend test/build because this changes payment state transitions, public callback endpoints, security rules, and application wiring. If SQL Server or merchant credentials are unavailable, clearly state that database/IPN live verification remains outstanding.

## VNPay protocol research
- Use VNPay API 2.1.0 and HMAC-SHA512 as documented at `https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html` and `https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html`.
- Browser return is informational. Only the signed server-to-server IPN triggers settlement, consistent with SRS §4 Payment & Escrow Management and the canonical `specs/SPEC.md` §8.2 state machine.
