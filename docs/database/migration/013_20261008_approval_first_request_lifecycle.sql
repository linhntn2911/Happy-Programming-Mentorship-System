-- Migration 013: Sync dbo.mentorship_requests lifecycle to the approval-first baseline
-- Date: 2026-10-08
--
-- The immutable baseline (docs/database/init/schema_31_tables.sql, lines 1052-1120) already
-- defines an approval-first monthly mentorship lifecycle (SPEC.md §8.2, GB-07):
--   submit -> PENDING (48h SLA, funded_at NULL) -> mentor ACCEPTED/REJECTED -> mentee pays
--   (funded_at set, request retains ACCEPTED).
-- The live dev database drifted from that baseline: it still carries the payment-first trigger
-- trg_request_funded_review, the pre-baseline constraint definitions (CK_requests_status allowed
-- PENDING_PAYMENT), and one legacy PENDING_PAYMENT row. This migration brings the live database
-- back into exact agreement with the baseline. The baseline init file is never edited.
--
-- Ordering:
--   1. SET QUOTED_IDENTIFIER ON so UPDATEs against the filtered index UX_requests_pending_pair
--      (WHERE status='PENDING') succeed (sqlcmd defaults it OFF -> Msg 1934).
--   2. Drop the payment-first trigger first, otherwise the PENDING backfill raises 51012.
--   3. Drop the five lifecycle constraints before the backfill, then re-add them verbatim from
--      the baseline WITH CHECK so every surviving row is validated against the new rules.
--   4. Recreate the two baseline triggers verbatim.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

-- 1. Remove the stale payment-first review trigger.
DROP TRIGGER IF EXISTS dbo.trg_request_funded_review;

-- 2. Drop the drifted lifecycle constraints so the legacy row can be backfilled.
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_status;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_funded;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_deadline;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_review_ready;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_response;

-- 3. Backfill the legacy payment-first row into the approval-first PENDING state with an exact
--    48h deadline so it satisfies the baseline CK_requests_deadline equality.
UPDATE dbo.mentorship_requests
SET status = 'PENDING',
    submitted_at = COALESCE(submitted_at, SYSUTCDATETIME()),
    response_deadline = DATEADD(HOUR, 48, COALESCE(submitted_at, SYSUTCDATETIME())),
    updated_at = SYSUTCDATETIME()
WHERE status = 'PENDING_PAYMENT';

-- 4. Re-add the five lifecycle constraints verbatim from the baseline (schema_31_tables.sql 1054-1062).
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_status CHECK (status IN ('DRAFT','PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED'));
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_funded CHECK (funded_at IS NULL OR (status = 'ACCEPTED' AND responded_at IS NOT NULL AND funded_at >= responded_at));
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_deadline CHECK ((status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL) OR (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NOT NULL AND response_deadline = DATEADD(HOUR,48,submitted_at)));
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_review_ready CHECK (status = 'ACCEPTED' OR funded_at IS NULL);
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_response CHECK ((status IN ('ACCEPTED','REJECTED') AND responded_at IS NOT NULL AND submitted_at IS NOT NULL AND responded_at >= submitted_at AND responded_at <= response_deadline) OR (status IN ('DRAFT','PENDING','EXPIRED') AND responded_at IS NULL) OR (status='CANCELLED' AND (responded_at IS NULL OR (submitted_at IS NOT NULL AND responded_at>=submitted_at AND responded_at<=response_deadline))));

-- 5. Recreate the approval-flow trigger verbatim from the baseline (schema_31_tables.sql 1065-1097).
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_request_approval_flow
ON dbo.mentorship_requests AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id=i.id
   WHERE d.id IS NULL AND i.status NOT IN (''DRAFT'',''PENDING''))
   THROW 51101, ''New applications must start as DRAFT or PENDING.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE i.status <> d.status AND NOT (
     (d.status=''DRAFT'' AND i.status=''PENDING'') OR
     (d.status=''PENDING'' AND i.status IN (''ACCEPTED'',''REJECTED'',''EXPIRED'',''CANCELLED'')) OR
     (d.status=''ACCEPTED'' AND i.status=''CANCELLED'' AND d.funded_at IS NULL)))
   THROW 51102, ''Invalid application status transition.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE d.status <> ''DRAFT'' AND
   (i.mentee_id<>d.mentee_id OR i.mentor_id<>d.mentor_id OR i.service_id<>d.service_id
    OR i.submitted_at<>d.submitted_at OR i.response_deadline<>d.response_deadline
    OR i.offer_snapshot<>d.offer_snapshot))
   THROW 51103, ''Submitted application identity, terms and deadline are immutable.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE (d.funded_at IS NOT NULL AND (i.funded_at IS NULL OR i.funded_at<>d.funded_at))
      OR (d.responded_at IS NOT NULL AND i.status=d.status AND i.responded_at<>d.responded_at))
   THROW 51104, ''Recorded funding and review timestamps are immutable.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i WHERE i.status <> ''ACCEPTED''
   AND EXISTS (SELECT 1 FROM dbo.payments p WHERE p.request_id=i.id AND p.status IN (''PENDING'',''SUCCEEDED'')))
   THROW 51105, ''Close pending checkout before cancellation; paid requests retain ACCEPTED.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i WHERE i.funded_at IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM dbo.payments p JOIN dbo.escrow_ledger_entries e ON e.payment_id=p.id
   WHERE p.request_id=i.id AND p.status=''SUCCEEDED'' AND p.paid_at=i.funded_at
     AND e.entry_type=''HOLD'' AND e.reversal_of_id IS NULL AND e.amount=p.amount))
   THROW 51106, ''Funding timestamp requires successful payment and full escrow HOLD.'', 1;
END;');

-- 6. Recreate the payment guard trigger verbatim from the baseline (schema_31_tables.sql 1098-1120).
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_payment_accepted_request
ON dbo.payments AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 -- Serialize review/cancellation with checkout through the same request row.
 IF EXISTS (SELECT 1 FROM inserted i
   JOIN dbo.mentorship_requests r WITH (UPDLOCK,HOLDLOCK) ON r.id=i.request_id
   LEFT JOIN deleted d ON d.id=i.id
   WHERE (d.id IS NULL OR i.status IN (''PENDING'',''SUCCEEDED''))
     AND (r.status <> ''ACCEPTED'' OR r.responded_at IS NULL OR i.created_at < r.responded_at
       OR (i.paid_at IS NOT NULL AND i.paid_at < r.responded_at)))
   THROW 51107, ''Monthly checkout requires mentor acceptance before payment.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE ISNULL(i.request_id,-1)<>ISNULL(d.request_id,-1)
      OR ISNULL(i.booking_id,-1)<>ISNULL(d.booking_id,-1)
      OR ISNULL(i.subscription_id,-1)<>ISNULL(d.subscription_id,-1)
      OR i.amount<>d.amount OR i.currency<>d.currency
      OR i.commission_rate_snapshot<>d.commission_rate_snapshot
      OR i.created_at<>d.created_at
      OR (d.status=''SUCCEEDED'' AND (i.status<>''SUCCEEDED'' OR i.paid_at<>d.paid_at)))
   THROW 51108, ''Payment target, amount, fee snapshot and successful result are immutable.'', 1;
END;');

COMMIT TRANSACTION;
