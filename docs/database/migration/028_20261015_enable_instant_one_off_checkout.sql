-- Migration 028: Allow one-off orders to enter checkout without mentor review.
-- Monthly mentorship keeps the existing 48-hour approval-first lifecycle.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_deadline;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_response;

-- Close legacy approval-first one-off requests that have no slot hold, then remove their obsolete
-- mentor-response deadline. They cannot be converted safely into instant bookings retroactively.
UPDATE dbo.mentorship_requests
SET status = 'CANCELLED',
    cancelled_at = COALESCE(cancelled_at, SYSUTCDATETIME()),
    cancellation_reason = COALESCE(cancellation_reason,
        N'Legacy one-off request closed when instant checkout was enabled.'),
    response_deadline = NULL,
    updated_at = SYSUTCDATETIME()
WHERE service_type = 'ONE_OFF' AND funded_at IS NULL AND status IN ('PENDING','ACCEPTED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.slot_holds h
      WHERE h.id = TRY_CONVERT(BIGINT, JSON_VALUE(dbo.mentorship_requests.offer_snapshot, '$.slotHoldId'))
        AND h.mentee_id = dbo.mentorship_requests.mentee_id
        AND h.mentor_id = dbo.mentorship_requests.mentor_id
        AND h.service_id = dbo.mentorship_requests.service_id
        AND h.service_type = 'ONE_OFF'
        AND h.status = 'HELD'
  );

UPDATE dbo.mentorship_requests
SET response_deadline = NULL, updated_at = SYSUTCDATETIME()
WHERE service_type = 'ONE_OFF' AND response_deadline IS NOT NULL;

ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_deadline CHECK (
    (service_type = 'ONE_OFF' AND (
        (status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL)
        OR (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NULL)
    ))
    OR
    (service_type = 'MONTHLY' AND (
        (status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL)
        OR
        (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NOT NULL
            AND response_deadline = DATEADD(HOUR,48,submitted_at))
    ))
);

ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_response CHECK (
    (service_type = 'ONE_OFF' AND status = 'DRAFT'
        AND submitted_at IS NULL AND responded_at IS NULL)
    OR
    (service_type = 'ONE_OFF' AND status = 'ACCEPTED'
        AND responded_at IS NOT NULL AND submitted_at IS NOT NULL AND responded_at >= submitted_at)
    OR
    (service_type = 'ONE_OFF' AND status IN ('PENDING','EXPIRED')
        AND submitted_at IS NOT NULL AND responded_at IS NULL)
    OR
    (service_type = 'ONE_OFF' AND status = 'REJECTED'
        AND submitted_at IS NOT NULL AND responded_at IS NOT NULL AND responded_at >= submitted_at)
    OR
    (service_type = 'MONTHLY' AND (
        (status IN ('ACCEPTED','REJECTED') AND responded_at IS NOT NULL
            AND submitted_at IS NOT NULL AND responded_at >= submitted_at AND responded_at <= response_deadline)
        OR (status IN ('DRAFT','PENDING','EXPIRED') AND responded_at IS NULL)
        OR (status='CANCELLED' AND (responded_at IS NULL OR
            (submitted_at IS NOT NULL AND responded_at>=submitted_at AND responded_at<=response_deadline)))
    ))
    OR
    (service_type = 'ONE_OFF' AND status = 'CANCELLED' AND submitted_at IS NOT NULL)
);

EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_request_approval_flow
ON dbo.mentorship_requests AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id=i.id
   WHERE d.id IS NULL
     AND NOT (i.status IN (''DRAFT'',''PENDING'') OR (i.service_type=''ONE_OFF'' AND i.status=''ACCEPTED'')))
   THROW 51101, ''New monthly applications require review; one-off orders may start accepted.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE i.status <> d.status AND NOT (
     (d.status=''DRAFT'' AND i.status=''PENDING'') OR
     (d.status=''PENDING'' AND i.status IN (''ACCEPTED'',''REJECTED'',''EXPIRED'',''CANCELLED'')) OR
     (d.status=''ACCEPTED'' AND i.status=''CANCELLED'' AND d.funded_at IS NULL)))
   THROW 51102, ''Invalid application status transition.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE d.status <> ''DRAFT'' AND
   (i.mentee_id<>d.mentee_id OR i.mentor_id<>d.mentor_id OR i.service_id<>d.service_id
    OR i.submitted_at<>d.submitted_at OR ISNULL(i.response_deadline,''19000101'')<>ISNULL(d.response_deadline,''19000101'')
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

COMMIT TRANSACTION;
