# SePay Mentorship QR Checkout

## User outcome
An accepted, unpaid mentorship application opens a checkout with the accepted mentor, package terms, and exact price. The mentee can initiate a SePay payment attempt, which generates an on-page dynamic bank transfer QR code for HappyProgramming's configured bank account (TPBank) with the exact order amount and a unique transfer code (e.g. `HP1024`). The mentee scans the QR code with their mobile banking app or copies transfer details. Upon money arriving at the bank account, SePay delivers a verified server-to-server webhook callback that settles payment atomically, places funds in escrow, and activates the mentorship subscription. The mentee's checkout view automatically detects settlement via background polling and transitions to the active mentorship confirmation state.

## Requirements
- Only the authenticated owning mentee may view checkout or initiate payment, and only while the request is `ACCEPTED` and not funded.
- Checkout details use the immutable application offer snapshot.
- Starting checkout creates/reuses an active `PENDING` payment attempt with a 15-minute expiry and commission snapshot.
- Each payment attempt has a concise, unique payment reference (format: `HP` + numeric payment ID or attempt code, e.g., `HP1024`), optimized for Vietnamese banking transfer descriptions.
- The checkout page directly displays the SePay dynamic QR image (`https://qr.sepay.vn/img?bank=...&acc=...&template=compact&amount=...&des=...`), along with bank name (`TPBank`), account number (`00000806194`), account holder (`NGUYEN THI NGOC LINH`), amount, and transfer code with one-click copy buttons.
- SePay webhook endpoint `POST /api/payments/sepay/webhook` verifies the authorization API key (`Authorization: Apikey <SEPAY_API_KEY>`), target account number, inbound transfer type (`in`), and amount.
- Settlement is atomic and idempotent: it verifies transaction deduplication, marks payment `SUCCEEDED`, holds funds in escrow, records `funded_at`, activates the subscription, and provisions the conversation state once.
- The checkout page automatically polls for payment confirmation every 3 seconds while pending. Once settled, it renders the confirmed active mentorship view without requiring a manual page refresh.
- Failed or expired attempts can be retried with a new reference and updated QR code while the application remains accepted and unfunded.

## Acceptance scenarios
1. An accepted unpaid application displays its mentor/package/amount and can prepare a SePay QR payment.
2. Initiation creates a pending attempt expiring in 15 minutes, returning the SePay QR URL, bank account details, and unique transfer code.
3. The checkout page displays the QR code, account details, copy actions, and an active 15-minute countdown timer.
4. An unauthenticated or invalid webhook request is rejected with HTTP 401 or 400.
5. A valid SePay webhook matching the pending code and amount atomically marks payment as succeeded, logs the escrow hold, and activates the subscription. Repeated webhooks respond idempotently without duplicate records.
6. The frontend automatically polls and updates to "Payment Confirmed · Mentorship Active" once settlement completes.
7. If an attempt expires before transfer, the mentee can regenerate a new payment QR code.
