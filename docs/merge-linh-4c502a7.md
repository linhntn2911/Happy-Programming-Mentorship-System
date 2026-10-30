# Latest linh integration — 2026-10-30

Source: `origin/linh` commit `4c502a7`. Target: `luong`, previously `32a532a`.

## Imported changes

- Transfer QR panel for administrator payouts and refunds.
- Optional refund receipt image, receipt download, mediation evidence and notification code.
- Monthly mentorship business-flow diagram.

## Merge resolutions

- Retain the incoming QR/receipt dialog and the existing 100-character refund transfer-reference limit. Payout references retain their existing 150-character limit.
- Renumber the incoming receipt migration from 037 to `038_20261030_add_dispute_refund_receipt_file.sql` because 037 is already used on `luong`. Register it in the Maven/Flyway resource mapping as V29; upstream did not add this mapping. Existing V1–V28 contents remain unchanged.
- Fix receipt validation to require a matching supported image signature and extension, reject empty content, and preserve the 5 MB limit. Previously the incoming code accepted arbitrary bytes with a `.png` filename and treated unknown data as PNG.
- Extend the SQL Server refund regression with a real PNG receipt, rejection of a fake PNG, owner download and denial of an unrelated user's download.

## Verification boundary

- Focused backend: 21 discovered, 20 passed, 1 configured skip.
- Full backend: 428 discovered, 421 passed, 7 configured skips, no failures/errors.
- Frontend: 163 passed; production build passed with the existing large-chunk warning.
- V29 successfully applied and validated on the isolated test database.
- Test counts include pre-existing untracked local workbook tests. Skipped live-database/concurrency checks are not claimed as passes; a clean checkout can have a lower test count.

Tests use isolated database `HPMS_SePay_Test_20261012`, disabled background financial jobs and a local non-delivering mail endpoint. No real bank transfers or email delivery are tested. The local development server/database is not restarted by this merge. Divergent migration histories from a separately deployed `linh` database require deliberate reconciliation rather than automatic Flyway repair.

Local logs are under `outputs/merge-linh-4c502a7-*.log` and are not committed. Existing unrelated files and workbook tests remain outside the merge commit.
