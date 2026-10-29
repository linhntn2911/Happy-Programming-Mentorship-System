# Contracts
PATCH /api/staff/payout-requests/{id}: APPROVED or REJECTED; active STAFF; REQUESTED only. APPROVED ignores no extra bank input; REJECTED requires rejectionReason.
PATCH /api/admin/payout-requests/{id}: PAID or REJECTED; active ADMIN; APPROVED only; payer cannot equal approver. PAID requires transferReference.
GET queues: Staff REQUESTED; Admin APPROVED. History GET /api/admin/payout-history adds approvedBy display name, approvedAt UTC; preserves terminal reviewedBy/reviewedAt. Wrong action role ->403; wrong stage/repeat/self-settlement ->409; malformed decision/reason/reference ->400. Existing ApiResponse format. Backend remains authoritative.
