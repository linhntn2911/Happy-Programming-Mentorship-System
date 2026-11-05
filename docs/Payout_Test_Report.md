# Mentor Portal — Payout, Notification & Dispute Test Report

- Branch: `Trung` (no merge, no checkout of other branches)
- Date: 2026-11-03
- Specification references: `SRS_G3_V1.1 (1).docx` / `SDS_G3_Ver1.1 (2).docx` — GB-19 → GB-26, UC68 (View Wallet & Payout History), UC69 (Request Withdrawal), §10.8 UC71 (Provide Dispute Response)
- Environment: Spring Boot 3.5 / Java 17 backend, Vite + Tailwind 4 frontend, SQL Server `localhost,1433` database `HappyProgramming`

## 1. Scope

| Area | Covered |
| --- | --- |
| Mentor wallet balances, released-earning entries, payout history (UC68) | Yes |
| OTP-gated withdrawal request (UC69, GB-19 → GB-21) | Yes |
| Admin payout decision: receipt link + mentor notification | Yes |
| Mentor dispute list / detail / response with evidence (UC71) | Yes |
| Staff & Admin dispute resolution, refund approval | Out of scope for this branch (Staff module explicitly excluded from the mentor work package) |

## 2. Payout status flow

Implemented lifecycle on `dbo.mentor_payout_requests`:

```text
REQUESTED ──► PAID       (admin records transfer_reference, optional receipt_url, reviewed_by/reviewed_at)
          └─► REJECTED   (admin records rejection_reason; reservation released back to available balance)
```

- A request reserves the mentor's available balance while `REQUESTED` (GB-20).
- `PAID` requires a non-empty `transfer_reference`; the database CHECK constraint enforces this.
- `receipt_url` is optional, must match `https?://…`, and is at most 1000 characters. A malformed value is rejected with HTTP 400 and leaves the payout in `REQUESTED`.
- The mentor-facing table renders `REQUESTED` as **Pending review**, `PAID` as **Paid**, `REJECTED` as **Rejected**, and shows a *View receipt* link only when a receipt URL exists.

### Divergence from GB-21

GB-21 describes a two-person flow with an intermediate `APPROVED` state (Staff approves, Admin pays). This branch implements a single Admin decision (`REQUESTED → PAID | REJECTED`) because the Staff approval screen is outside the mentor work package. `origin/linh` already contains the two-step model (`docs/database/migration/032_20261028_add_payout_approval_step.sql`, `MentorWalletService.decidePayout` with `APPROVED`); when the branches converge, Linh's `APPROVED` state is authoritative and the notification hooks added here must be re-attached to it. The frontend status map already contains an `APPROVED → Approved` label so no UI change is needed.

## 3. Notifications

`NotificationService.create(userId, title, message, type, actionUrl)` writes to `dbo.notifications`. Payout outcomes now notify the mentor automatically:

| Trigger | `type` | Message content | `action_url` |
| --- | --- | --- | --- |
| Payout marked `PAID` | `PAYOUT_PAID` | Amount in VND + bank transfer reference | `/mentor/wallet` |
| Payout marked `REJECTED` | `PAYOUT_REJECTED` | Payout request id + rejection reason | `/mentor/wallet` |
| Malformed receipt link (400) | none | No row is written; the payout stays `REQUESTED` | — |

## 4. Test results

### 4.1 Backend — `./mvnw.cmd -o test` (focused payout + dispute classes)

Result: **Tests run: 50, Failures: 0, Errors: 0, Skipped: 1 — BUILD SUCCESS**

| Test class | Tests | Result |
| --- | --- | --- |
| `MentorWalletServiceTest` | 5 | Passed |
| `MentorWalletControllerTest` | 7 | Passed |
| `MentorPayoutOtpIntegrationTest` | 7 | Passed |
| `SepaySettlementIntegrationTest` | 11 (1 skipped) | Passed |
| `MentorDisputeServiceTest` | 4 | Passed |
| `MentorDisputeControllerTest` | 8 | Passed |
| `MentorDisputeIntegrationTest` | 8 | Passed |

Notable payout cases inside `SepaySettlementIntegrationTest`:

| Case | Expectation | Result |
| --- | --- | --- |
| `paidPayoutStoresReceiptAndNotifiesMentor` | `PAID` persists `receipt_url`, returns it through `GET /api/mentors/me/wallet`, writes one `PAYOUT_PAID` notification containing the transfer reference | Passed |
| `paidPayoutRejectsAMalformedReceiptLink` | `javascript:alert(1)` → HTTP 400, status stays `REQUESTED`, no notification row | Passed |
| `rejectedPayoutNotifiesMentorWithTheReason` | `REJECTED` writes one `PAYOUT_REJECTED` notification containing the rejection reason and releases the reservation | Passed |

The single skipped test is a pre-existing SePay live-webhook case that requires external provider configuration; it is unrelated to this work package.

Notable dispute cases:

| Case | Expectation | Result |
| --- | --- | --- |
| Own disputes only + status filter | A mentor never sees another mentor's dispute; unknown filter value → 400 | Passed |
| Detail shows mentee evidence | Submission-level attachments are downloadable by the respondent mentor | Passed |
| Respond with attachment | `POST …/responses` (multipart) stores the response and evidence, returns 201 | Passed |
| Other mentor / mentee caller | 403 for a non-respondent mentor, 403 for a mentee on all four endpoints, 401 when unauthenticated | Passed |
| Closed dispute | Responding to a `RESOLVED` dispute → 409 | Passed |
| `respondingNeverChangesTheDisputeDecision` | After a mentor response, `status`, `resolution`, `resolved_by`, `refund_id`, `resolved_at` are unchanged | Passed |
| Unsupported mime type | 400 and **no** `dispute_responses` row is left behind (files are validated before insert) | Passed |
| Mentor cannot resolve or close | `PATCH` / `DELETE` on `/api/mentors/me/disputes/{id}` → 405; no such endpoint exists | Passed |

### 4.2 Frontend — `npm run build` and `npm test`

| Check | Result |
| --- | --- |
| `npm run build` | Passed — 87 modules transformed, no errors, no warnings |
| `npm test` | Passed — **tests 105, pass 105, fail 0** |
| New/updated mentor payout + dispute tests | 21 tests, all passed |

New frontend coverage:

- `MentorDisputesPage.test.js` (7): list shell, status filter options, nav `aria-current`, "staff decide the outcome" copy, status/reason/resolution labels, open-detail response form with no approve-refund or close-dispute control, closed-detail staff decision, HTML escaping of untrusted dispute text.
- `mentorDisputeService.test.js` (6): status query encoding, single-dispute fetch, multipart response with `X-CSRF-TOKEN`, 409 backend message propagation, CSRF failure, evidence download URL.
- `MentorWalletPage.test.js` (+5): `Pending review` label for `REQUESTED`, receipt link for `PAID`, no receipt link for `REJECTED`, non-http(s) receipt URL ignored, empty state preserved.

### 4.3 Failed items

No test failed in the final run. Failures found and fixed during this work package:

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Empty error bodies — `No value at JSON path $.success` | `MentorApiExceptionHandler` `assignableTypes` did not list `MentorDisputeController` | Added the controller to the advice list |
| `The index 5 is out of range` on the files insert | A `?` inside the literal storage-key string was counted as a JDBC parameter | Storage key is built in Java and bound as a parameter |
| A rejected attachment still left a `dispute_responses` row | File mime/size validation ran after the response insert | Extracted `prepare(MultipartFile)`; all attachments are validated before any insert |
| Migration 030 aborted at `CREATE INDEX` (Msg 1934 `QUOTED_IDENTIFIER`) and left the database half-migrated | Filtered indexes require `QUOTED_IDENTIFIER ON`; the script was not re-runnable | Added `SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;` and wrapped every index in its own existence guard |
| Seed 031 failed with `Invalid object name dbo.dispute_evidence` | Cascading failure from the aborted 030 | Re-applied 030 with `sqlcmd -I -b`, then 031 succeeded |
| `OUTPUT INSERTED.id INTO @scalarVariable` rejected | T-SQL does not allow `OUTPUT … INTO` a scalar | Seed uses a table variable plus `SELECT @var = id FROM @newIds` |

## 5. Manual verification performed

- Migrations `029`, `030`, `031` applied to the local `HappyProgramming` database; `dbo.disputes` holds one row per status (`SUBMITTED`, `IN_MEDIATION`, `RESOLVED`, `REJECTED`), one `dispute_responses` row and three `dispute_evidence` rows.
- Append-only triggers verified: updating or deleting a dispute response or evidence row throws (51301 / 51302).
- `GET /api/mentors/me/wallet` returns `receiptUrl` for a paid payout and the frontend *View receipt* link resolves to it.

## 6. Open items before merging with `origin/linh`

`git fetch` was run without merging. `origin/main` is fully contained in `Trung`; `origin/linh` (`4c502a7`) has **43 commits** that `Trung` does not contain, merge base `fa18108`. Conflicts to resolve deliberately:

1. **Migration numbering collision.** `Trung` uses `028`–`031` for feedback seed, payout receipt, dispute tables and dispute seed; `origin/linh` uses `028`–`037` for one-off checkout, workspace conversations, mentee disputes, operational settings, payout approval, refund approval, mediation rooms and refund receipt. The four `Trung` files must be renumbered to `038`+ and the `backend/pom.xml` copy targets (currently `V19`, `V20`) updated to unused Flyway versions.
2. **Same table names, incompatible schemas.** Both branches create `dbo.disputes` and `dbo.dispute_evidence`. Linh's version adds `ticket_code`, `payment_id NOT NULL`, `category`, `disputed_amount`, `AWAITING_EVIDENCE`, `approved_by`, `receipt_file_id`; this branch uses `reason_code`, `resolution IN (FULL_REFUND, PARTIAL_REFUND)` and a `dispute_responses` table. Linh's schema (spec `027-dispute-mediation-room`) should win; the mentor read/respond endpoints here must then be re-pointed at it.
3. **`DisputeFileDownload.java` exists on both branches** with different shapes — reconcile into one DTO.
4. **Payout notifications are additive.** Linh's `MentorWalletService` has no notification calls, so `PAYOUT_PAID` / `PAYOUT_REJECTED` and the `receipt_url` column can be ported onto Linh's two-step flow without conflict of intent.

## 7. Re-running the checks

```bash
cd backend
./mvnw.cmd -o test -Dtest='MentorDisputeServiceTest,MentorDisputeControllerTest,MentorDisputeIntegrationTest,MentorWalletServiceTest,MentorWalletControllerTest,MentorPayoutOtpIntegrationTest,SepaySettlementIntegrationTest'

cd ../frontend
npm run build
npm test
```
