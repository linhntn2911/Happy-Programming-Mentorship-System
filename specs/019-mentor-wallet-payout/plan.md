# Implementation Plan: Mentor Wallet and Payout Requests

Use the existing SePay webhook and immutable escrow ledger. Add an idempotent scheduled release after seven days, append mentor share and platform commission entries, and add a mentor-owned payout request lifecycle. Encrypt destination account data with AES-GCM using a configured 256-bit key. Admin payout processing remains manual and records the external bank transfer reference.

## Data & API

- Versioned SQL Server migration extends the escrow ledger entry types and adds payout request storage/indexes.
- `GET /api/mentors/me/wallet`: balances, ledger history, and the mentor's payout requests (never returns full account number).
- `POST /api/mentors/me/payout-requests`: amount and bank destination; only within available balance.
- `GET /api/admin/payout-requests`: pending requests and decrypted destination details for authorized admin review.
- `PATCH /api/admin/payout-requests/{id}`: mark `PAID` with transfer reference or `REJECTED` with reason.

## Security and Operations

- Require MENTOR for wallet endpoints and ADMIN for payout operations.
- Store encrypted account number and masked last four digits; do not log request payloads.
- The release job is conditional on payment scheduler configuration and idempotent under concurrent execution.
- Never execute a database migration or move money as part of coding.

## Verification

- Unit tests cover release amount/fee rounding, encryption, and input validation.
- Database-backed tests cover idempotent release, concurrent balance reservation, paid payout ledger posting, and rejection releasing reservations.
- Run the backend test suite and frontend tests for the new mentor wallet page.

## SePay integration repair (2026-10-12)
Verified SEPAY and VNPAY receipts use the same escrow ledger. Available wallet balance is released mentor share minus completed payouts minus active reservations; the request and admin decision paths must agree. Gross commission reporting is an estimate before refunds, while actual release subtracts completed refunds and rounds the saved rate to whole VND. Validation may migrate a dedicated disposable database copy; the existing development database is not migrated by the repair workflow.


## Operational policy amendment (2026-10-23)
Feature 029 supersedes the fixed seven-day hold for newly verified payments: snapshot the Admin-configured 1–90-day hold at settlement. Historical payments retain seven days. Withdrawals must exceed the configured threshold (at least 10,000 VND). A fixed fee is disclosed and snapshotted; the wallet debits gross, and the external transfer equals gross minus fee. Existing requests retain their fee.
