# Data Model: Mentor Wallet and Payout Requests

## Existing source of truth

- `payments`: only `SUCCEEDED` VNPay payments with a verified IPN are eligible.
- `escrow_ledger_entries`: append-only monetary ledger. Existing `HOLD` entry records gross payment; new `MENTOR_RELEASE` and `PLATFORM_FEE` entries split the distributable remainder after seven days; `MENTOR_PAYOUT` entries debit a completed manual transfer.
- `refunds`: successful refunds reduce distributable payment value; pending/processing refunds pause release.

## `mentor_payout_requests`

- `id`, `mentor_id`, `amount`, `bank_name`, `account_name`, encrypted `account_number_ciphertext`, `account_last4`, `status`, `transfer_reference`, `rejection_reason`, `reviewed_by`, `requested_at`, `reviewed_at`.
- Statuses: `REQUESTED`, `PAID`, `REJECTED`.
- `REQUESTED` amount is reserved from available balance. `REJECTED` releases the reservation. `PAID` is paired with append-only payout ledger allocation(s).
- Account number uses AES-GCM with a random per-record nonce; only an administrator endpoint decrypts pending requests.

## Balance formulas

- Held: net mentor share of successful payments that have a `HOLD` but no `MENTOR_RELEASE`.
- Available: sum of `MENTOR_RELEASE` minus `MENTOR_PAYOUT` ledger entries minus `REQUESTED` payout reservations.
- Paid out: sum of `MENTOR_PAYOUT` entries.
