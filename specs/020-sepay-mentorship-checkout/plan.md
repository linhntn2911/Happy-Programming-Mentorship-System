# Plan: SePay Mentorship QR Checkout

## Architecture
- Maintain ownership boundaries in `MentorshipRequestService`.
- Introduce `SepayPaymentService` to manage SePay payment attempt creation, dynamic QR URL generation, and atomic webhook settlement.
- Expose `POST /api/payments/sepay/webhook` in `PaymentController` with `Authorization: Apikey <SEPAY_API_KEY>` verification and CSRF exclusion in `SecurityConfig`.
- Keep `POST /api/mentorship-requests/{id}/checkout` returning `CheckoutResponse` containing SePay QR URL, bank name, account number, account holder, transfer code, amount, and expiry.
- Enhance `GET /api/mentorship-requests/{id}/checkout-info` to return payment bank and QR details when an attempt is pending.
- Use existing `payments` (`gateway = 'SEPAY'`), `payment_events` (`provider = 'SEPAY'`), `escrow_ledger_entries`, `subscriptions`, and `conversations` tables. No schema migration is required.
- Update `CheckoutPage.js` to render the on-page QR code, account details with copy buttons, countdown timer, and automatic 3-second status polling until payment is detected.

## Security & Reliability
- External webhook authorization: Verify `Authorization` header against configured `hpms.sepay.api-key`.
- Inbound validation: Reject payloads where `transferType != 'in'`, `accountNumber != hpms.sepay.account-number`, or `transferAmount < payment.amount`.
- Deduplication & Idempotency: Dedup via `dbo.payment_events` using `provider='SEPAY'`, `event_key=referenceCode`.
- Concurrency control: Lock payment and mentorship request records with `UPDLOCK, HOLDLOCK`.
- Safe cancellation & retry: Expired attempts can be replaced by re-initiating checkout with an incremented attempt number.

## Validation
- Unit tests for `SepayPaymentService` (initiation, QR URL generation, webhook verification, idempotent settlement).
- Controller tests for `PaymentController` SePay webhook endpoint and security filtering.
- Frontend tests for `CheckoutPage` rendering SePay QR, copying account details, countdown timer, and auto-polling.
