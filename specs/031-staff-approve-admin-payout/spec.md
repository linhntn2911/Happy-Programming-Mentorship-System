# Staff approval and Admin payout
Approved user request, 2026-10-28. Supersedes payout-role wording in 019/030 and the prior single-step implementation.
Staff reviews REQUESTED withdrawals and approves or rejects them. Admin pays only APPROVED requests or rejects them before transfer. Mentor sees the stage. No bank transfer via Staff personal accounts.
- REQUESTED -> APPROVED: active Staff only, record approver/time, audit, no ledger debit.
- REQUESTED -> REJECTED: active Staff, nonblank reason, release reservation.
- APPROVED -> PAID: active Admin, external transfer reference required, gross ledger debit once.
- APPROVED -> REJECTED: active Admin, reason required, release reservation.
- Admin cannot skip Staff approval; Staff cannot mark PAID. Dual-role users cannot approve and settle their own request.
- REQUESTED and APPROVED both reserve the gross amount; no second withdrawal of reserved funds.
- APPROVED remains pending payment if external transfer is uncertain. No automatic transfer/retry.
- Existing pending requests require approval; historical terminal rows remain unchanged.
- Approval and final decision identities/timestamps remain separately available in Admin history.
- No new fine-grained Staff permission: active STAFF role grants review responsibility, independently of the four existing permissions. This is explicit policy, not accidental menu access.
Acceptance: exercise every allowed transition, denied role/stage, duplicate/concurrent decision, reservation retention/release, fee snapshot and net payment, inactive role, migration with existing terminal records.
