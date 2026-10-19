# Plan: SePay Mentorship QR Checkout

## Architecture
- Maintain ownership boundaries in `MentorshipRequestService`.
- Introduce `SepayPaymentService` to manage SePay payment attempt creation, dynamic QR URL generation, and atomic webhook settlement.
- Expose `POST /api/payments/sepay/webhook` in `PaymentController` with `Authorization: Apikey <SEPAY_API_KEY>` verification and CSRF exclusion in `SecurityConfig`.
- Keep `POST /api/mentorship-requests/{id}/checkout` returning `CheckoutResponse` containing SePay QR URL, bank name, account number, account holder, transfer code, amount, and expiry.
- Enhance `GET /api/mentorship-requests/{id}/checkout-info` to return payment bank and QR details when an attempt is pending.
- Use existing `payments` (`gateway = 'SEPAY'`), `payment_events` (`provider = 'SEPAY'`), `escrow_ledger_entries`, `subscriptions`, `conversations`, `slot_holds`, and `bookings` tables. Migration `028_20261015_enable_instant_one_off_checkout.sql` changes only request lifecycle constraints and the guard trigger; it adds no table or column.
- Branch settlement by immutable `serviceType`: monthly activates a subscription; one-off validates and converts its hold, then creates confirmed booking rows.
- Update `CheckoutPage.js` to render the on-page QR code, account details with copy buttons, countdown timer, and automatic 3-second status polling until payment is detected.

## Security & Reliability
- External webhook authorization: Verify `Authorization` header against configured `hpms.sepay.api-key`.
- Inbound validation: Reject payloads where `transferType != 'in'`, `accountNumber != hpms.sepay.account-number`, or `transferAmount != payment.amount`.
- Deduplication & Idempotency: Dedup via `dbo.payment_events` using `provider='SEPAY'`, `event_key=SEPAY:<provider id> (also recognize provider id in legacy event JSON)`.
- Concurrency control: Lock payment and mentorship request records with `UPDLOCK, HOLDLOCK`.
- Safe cancellation & retry: Expired attempts can be replaced by re-initiating checkout with an incremented attempt number.
- Delayed delivery: validate expiry against SePay's authenticated transaction time. Before converting an expired one-off hold, lock and recheck overlapping active holds and bookings; settle only when the interval remains unclaimed.

## Validation
- Unit tests for `SepayPaymentService` (initiation, QR URL generation, webhook verification, idempotent settlement).
- Controller tests for `PaymentController` SePay webhook endpoint and security filtering.
- Frontend tests for `CheckoutPage` rendering SePay QR, copying account details, countdown timer, and auto-polling.

## Repair plan (2026-10-12)
Use existing service/DTO endpoints with strict fail-closed validation. Remove runtime secret defaults and document environment-only configuration. Validate stable SePay id; lock the mentorship request before payment rows consistently with initiation. Keep transaction and unique ledger/event protection. Test invalid, expired and duplicate webhook paths and settlement rollback using SQL Server transactions; verify wallet payout depletion and refunds/release. Run migrations through V13 on a separate database copy. Repair Staff test fixtures instead of relaxing backend authorization. Add shared whole-VND commission calculation to Admin report/CSV and explicit gross-estimate labels. No production schema edits or bank transfers.
