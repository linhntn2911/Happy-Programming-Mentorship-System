# Data
mentor_payout_requests adds approved_by FK users, approved_at UTC datetime2. Pair must both be null or set. APPROVED requires pair and null terminal fields. PAID legacy records may have null approval; new paid transitions require approval through both service and lifecycle trigger. Terminal reviewer must differ from approver. Reservation sum includes REQUESTED,APPROVED. No rewriting existing financial records.

V24 replaces the legacy terminal-only trigger. Only REQUESTED -> APPROVED/REJECTED and APPROVED -> PAID/REJECTED updates are allowed; deletes, amount/fee/destination edits, and changes to an existing approval are rejected. V23 was already applied to the test database, so its checksum is preserved.
