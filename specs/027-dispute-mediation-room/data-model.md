# Data Model: Dispute Intake

## `disputes`

One immutable complaint record per submission. Exactly one of `booking_id` or `subscription_id` is populated. `previous_target_status` preserves the state that staff resolution must restore or advance later. `payment_id` and `disputed_amount` snapshot the frozen financial context.

Active statuses are `SUBMITTED`, `IN_MEDIATION`, and `AWAITING_EVIDENCE`. Filtered unique indexes prevent more than one active dispute for the same booking or subscription.

## `dispute_evidence`

Associates private rows in `files` with a dispute. Initial evidence is immutable and ordered by `display_order`. The file record stores bytes, MIME type, size, checksum, uploader, and an authorized-only visibility marker.

## Escrow freeze

An active dispute linked to a payment is the authoritative dispute hold. Wallet release queries exclude payments with an active dispute. No financial ledger value is duplicated when the hold is created.
