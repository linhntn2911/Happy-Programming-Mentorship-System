# linh integration — 2026-10-30

## Scope

Merge `origin/linh` at `f8c2b79` into `luong` at `b1d8ffb`.
Import upstream chat, mediation, refund, Google sign-in, and mentor UI changes while preserving the existing two-stage payout authorization. This is integration of existing upstream work, not a separate implementation of the previously paused refund proposal.

## Conflict decisions

- Keep Staff approval followed by Admin external payout settlement. Preserve separate approval and settlement audit fields, active-account checks, wallet reservations, and protection against duplicate settlement.
- Retain upstream refund and mediation UI and service changes. Staff approval keeps funds reserved; Admin records the external refund transfer.
- Preserve applied migration contents and identifiers on `luong`. Do not replace an already-applied migration with the upstream variant.
- Remove the incoming duplicate payout-approval migration. Retain existing migration 032 / Flyway V23 and migration 033 / V24.
- Append upstream refund and mediation migrations as follows:

| Repository migration | Flyway version | Purpose |
| --- | --- | --- |
| 034_20261029_add_dispute_refund_approval_step.sql | V25 | Refund approval |
| 035_20261030_split_dispute_mediation_conversations.sql | V26 | Separate mediation conversations |
| 036_20261030_backfill_open_dispute_mediation_rooms.sql | V27 | Existing open disputes |
| 037_20261030_move_legacy_mediation_notices.sql | V28 | Legacy notices |

These migrations validated and applied on `HPMS_SePay_Test_20261012`. A database that already ran the divergent `linh` migration numbering needs a separately reviewed reconciliation; do not automatically repair checksums, reset a database, or run these under conflicting version numbers.

## Integration repairs and API clarification

- Observed: the workspace test no longer compiled after the upstream summary DTO rename. Updating the assertion exposed that `partnerRole` still contained the viewer's role. Repair: summary roles now match the other participant; mediation summaries viewed by Staff/Admin use `MENTEE_AND_MENTOR`. Detail DTO `currentUserRole` retains its existing meaning.
- Observed: the old Google test expected no account to be created. Upstream now provisions a Mentee account from verified Google sign-in. The regression test checks that requesting Mentor login still fails and the stored role remains Mentee on repeated attempts.
- Observed: the imported refund validation accepted 150 characters although `refunds.gateway_refund_id` allows 100. Repair: request DTO, service validation and refund dialog now limit transfer references to 100 characters. A 101-character reference returns 400 before settlement and leaves the dispute APPROVED.
- Adjusted two UI assertions to the retained two-stage payout wording.

## Verification

- Backend: Maven offline `test` on Java 17, isolated SQL Server test database: **428 discovered, 421 passed, 7 skipped, 0 failures/errors**.
- Frontend: `npm test`: **158 passed**, no failures/skips.
- Frontend: `npm run build`: passed; existing large-chunk warning remains.
- Added a transactional SQL Server integration test for Staff refund approval, blocking release while refund approval is pending, denying Staff settlement, overlong transfer-reference rejection, Admin settlement, and duplicate settlement rejection.
- Existing payment, payout, permission, authentication and application tests ran as part of the backend suite.
- Seven configured skips remain: two live-database checks, one workspace repository integration check, two mentor dashboard transaction checks, one mentor profile transaction check, and the opt-in concurrent SePay callback check. These are not counted as passes.
- Local pre-existing untracked workbook tests were included by test discovery but are not part of this merge commit; a clean checkout can therefore have a lower test count.

Local execution logs: `outputs/merge-linh-20261030-backend.log`, `outputs/merge-linh-20261030-frontend.log`, and `outputs/merge-linh-20261030-build.log` (not committed).

## Boundaries

No real bank transfer, live SePay callback, external email delivery, full manual browser walkthrough, or concurrency certification was performed. This verification does not certify every business edge case. Development runtime/database was not restarted or migrated by this verification. Existing unrelated user files remain outside the merge commit. Whitespace warnings inherited from upstream were left unchanged, including the applied migration's final blank line.
