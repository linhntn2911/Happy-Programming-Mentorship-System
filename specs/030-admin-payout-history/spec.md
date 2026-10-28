# Admin payout history
Status: Approved for implementation by user request, 2026-10-28.

Admins need to track pending, paid and rejected mentor withdrawals in one screen without searching audit logs.
## Requirements and acceptance
- Show all three statuses, newest requests first with a stable ID tie break.
- Search by mentor name/email, payout ID or transfer reference; filter status and requested UTC date range; paginate results.
- Display gross, fee, net, bank destination, request/review dates, reviewer, transfer reference and rejection reason.
- Pending requests retain existing record-transfer/reject actions. Completed requests are read-only and remain visible after refresh.
- Only active Admins may read the new history API. Historical bank numbers are masked.
- Reuse existing error, loading, empty, success, keyboard and confirmation states. Escape stored text.
- No transfer, ledger, OTP, reservation, schema or Staff authorization changes.
## Clarifications
Scope is payout history, not every unrelated Admin enhancement. Existing Staff payout access conflicts with spec 019 admin-only wording; this bounded read-only feature neither expands nor resolves that pre-existing authorization discrepancy.
