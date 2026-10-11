# Quickstart: VNPay checkout

1. Register the application with VNPay and obtain sandbox `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET`.
2. Set `VNPAY_ENABLED=true`, the two merchant values, and the local backend/frontend return URLs from `docs/payments/vnpay-setup.md` in the backend process environment.
3. Start the backend and frontend, sign in as a mentee, and open an accepted unpaid request from `#/applications`.
4. Confirm checkout displays the mentor, accepted package, monthly price, calls/session duration, learning goals, and total due. Click Continue to VNPay and finish a sandbox transaction.
5. For a successful local end-to-end run, expose the backend with a public HTTPS tunnel, configure that IPN URL in the VNPay merchant portal, and set `PAYMENT_EXPIRY_ENABLED=true`. The browser return without IPN must continue to show pending; a verified IPN should show paid and active.
6. Test a failed or cancelled sandbox transaction. The request must remain accepted and a new attempt must be available.

No schema migration is required; all state is stored in the existing payments, payment_events, escrow ledger, subscriptions, conversations, and request tables.
