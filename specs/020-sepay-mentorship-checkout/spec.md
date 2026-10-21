# SePay Mentorship QR Checkout

## User outcome
An accepted, unpaid mentorship application opens a checkout with the accepted mentor, package terms, and exact price. The mentee can initiate a SePay payment attempt, which generates an on-page dynamic bank transfer QR code for HappyProgramming's configured bank account (TPBank) with the exact order amount and a unique transfer code (e.g. `HP1024`). The mentee scans the QR code with their mobile banking app or copies transfer details. Upon money arriving at the bank account, SePay delivers a verified server-to-server webhook callback that settles payment atomically, places funds in escrow, and activates the mentorship subscription. The mentee's checkout view automatically detects settlement via background polling and transitions to the active mentorship confirmation state.

## Requirements
- Only the authenticated owning mentee may view checkout or initiate payment, and only while the request is `ACCEPTED` and not funded.
- Monthly requests become `ACCEPTED` through mentor approval. One-off orders become `ACCEPTED` immediately after the system validates an owned, active slot hold; mentor approval is not part of one-off checkout.
- Checkout details use the immutable application offer snapshot.
- Monthly checkout uses the accepted package `price`. One-off checkout uses `totalPrice = unit price × sessions × participants` from the immutable snapshot.
- Starting checkout creates/reuses an active `PENDING` payment attempt with a 15-minute expiry and commission snapshot.
- Each payment attempt has a concise, unique payment reference (format: `HP` + numeric payment ID or attempt code, e.g., `HP1024`), optimized for Vietnamese banking transfer descriptions.
- The checkout page directly displays the SePay dynamic QR image (`https://qr.sepay.vn/img?bank=...&acc=...&template=compact&amount=...&des=...`), along with bank name (`TPBank`), account number (`00000806194`), account holder (`NGUYEN THI NGOC LINH`), amount, and transfer code with one-click copy buttons.
- SePay webhook endpoint `POST /api/payments/sepay/webhook` verifies the authorization API key (`Authorization: Apikey <SEPAY_API_KEY>`), target account number, inbound transfer type (`in`), and amount.
- Settlement is atomic and idempotent: it verifies transaction deduplication, marks payment `SUCCEEDED`, holds funds in escrow, records `funded_at`, activates the subscription, and provisions the conversation state once.
- For a one-off order, settlement converts the active slot hold and creates `CONFIRMED` booking records instead of creating a subscription. An expired or conflicting hold is routed to reconciliation and creates no booking.
- The checkout page automatically polls for payment confirmation every 3 seconds while pending. Once settled, it renders the confirmed active mentorship view without requiring a manual page refresh.
- Failed or expired attempts can be retried with a new reference and updated QR code while the application remains accepted and unfunded.
- For one-off sessions, an expired slot hold cannot be renewed from checkout; the Mentee returns to availability to reserve another time before a new QR can be generated.
- A Mentee may cancel an accepted but unpaid checkout. The cancellation marks every pending payment attempt cancelled; for a one-off checkout it also releases the held session time immediately.
- If SePay retries a delayed webhook, a transfer made within the payment window may settle after delivery recovers. For one-off sessions, settlement must also confirm that the reserved interval has not since been claimed by another hold or booking; conflicts remain in manual reconciliation.

## Acceptance scenarios
1. An accepted unpaid application displays its mentor/package/amount and can prepare a SePay QR payment.
2. Initiation creates a pending attempt expiring in 15 minutes, returning the SePay QR URL, bank account details, and unique transfer code.
3. The checkout page displays the QR code, account details, copy actions, and an active 15-minute countdown timer.
4. An unauthenticated or invalid webhook request is rejected with HTTP 401 or 400.
5. A valid SePay webhook matching the pending code and amount atomically marks payment as succeeded, logs the escrow hold, and activates the subscription. Repeated webhooks respond idempotently without duplicate records.
6. The frontend automatically polls and updates to "Payment Confirmed · Mentorship Active" once settlement completes.
7. If an attempt expires before transfer, the mentee can regenerate a new payment QR code.
8. A one-off order opens checkout without mentor review, charges its calculated total, and creates confirmed bookings only after a verified exact payment.

## Repair acceptance (2026-10-12)
User authorized the review repairs. Missing/disabled private SePay configuration must fail closed; require Apikey authentication, inbound type, configured account and a positive stable provider event ID before settlement. Accept only SEPAY/VND PENDING attempts before expiry. Late/cancelled payments require manual reconciliation and must not activate subscriptions. Duplicate provider IDs must not settle a second order. Wallet available funds equal released minus paid minus reserved. Admin commission is gross estimated commission, rounded per transaction to whole VND consistently across totals, rows and CSV. Refunds and payouts remain separately identified; gross reports never claim available cash. All SQL integration verification uses an isolated copy, with existing local database unchanged.
