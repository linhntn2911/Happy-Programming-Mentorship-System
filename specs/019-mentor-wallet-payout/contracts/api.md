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

Requires active administrator role. Returns only Staff-approved requests including the decrypted account number for manual bank transfer.

## `GET/PATCH /api/staff/payout-requests`

Requires Staff role. `GET` returns `REQUESTED` payouts. `PATCH` accepts `APPROVED` or `REJECTED`; Staff cannot mark a payout paid.

## `PATCH /api/admin/payout-requests/{id}`

Requires administrator role and CSRF. Paid decision:

```json
{
  "decision": "PAID",
  "transferReference": "BANK-TRANSFER-REFERENCE",
  "receiptFileName": "receipt.png",
  "receiptBase64": "data:image/png;base64,...",
  "receiptMimeType": "image/png"
}
```

Rejected decision:

```json
{ "decision": "REJECTED", "rejectionReason": "Reason for rejection" }
```

Only `APPROVED` items can be marked `PAID`. Payment requires a completed external bank transfer, its reference, and a valid receipt image. The backend posts the immutable payout debit, receipt reference, notification, and audit record atomically.

## `GET /api/mentors/me/payout-requests/{id}/receipt`

Requires Mentor role and ownership of the paid payout. Returns the stored receipt with `no-store` and `nosniff` headers.
