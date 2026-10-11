# API Contract: Mentor Wallet and Payout Requests

All responses use `{ success, message, data, timestamp }`. Mutations require the current session and Spring CSRF token.

## `GET /api/mentors/me/wallet`

Requires mentor role. Returns `heldAmount`, `availableAmount`, `reservedAmount`, `paidOutAmount`, up to 50 ledger entries, and up to 50 payout request records. Mentor-visible account destination is limited to bank name, account holder, and last four account digits.

## `POST /api/mentors/me/payout-requests`

Requires mentor role and CSRF. JSON body:

```json
{
  "amount": 500000,
  "bankName": "Example Bank",
  "accountName": "Mentor Name",
  "accountNumber": "1234567890"
}
```

Amount must be a positive whole VND and no greater than available funds. Account number must contain 6–34 digits. A successful request reserves the amount and returns a masked destination.

## `GET /api/admin/payout-requests`

Requires active administrator role. Returns pending requests including the decrypted account number for manual bank transfer. This endpoint must never be exposed to mentor or staff roles.

## `PATCH /api/admin/payout-requests/{id}`

Requires administrator role and CSRF. Paid decision:

```json
{ "decision": "PAID", "transferReference": "BANK-TRANSFER-REFERENCE" }
```

Rejected decision:

```json
{ "decision": "REJECTED", "rejectionReason": "Reason for rejection" }
```

Only `REQUESTED` items can be decided. `PAID` requires that the external bank transfer has already completed; the backend posts an immutable payout debit and audit record atomically.
