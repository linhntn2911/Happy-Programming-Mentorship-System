SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add approved_by and approved_at columns to mentor_payout_requests if they do not exist
IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD approved_by BIGINT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_mentor_payout_requests_approver')
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_approver
        FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD approved_at DATETIME2(3) NULL;
END;

-- Update status check constraint to allow APPROVED
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_status')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_status;

ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_status
    CHECK (status IN ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED'));

-- Update review check constraint using dynamic SQL so SQL Server's query compiler
-- does not throw Msg 207 ("Invalid column name") for newly added columns in the same batch.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_review')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_review;

EXEC(N'ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_review CHECK (
    (status = ''REQUESTED'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = ''APPROVED'' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
    OR (status = ''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)), '''') IS NOT NULL AND rejection_reason IS NULL)
    OR (status = ''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)), '''') IS NOT NULL AND transfer_reference IS NULL)
)');

-- Update lifecycle trigger to allow REQUESTED -> APPROVED -> PAID / REJECTED
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_mentor_payout_request_lifecycle
ON dbo.mentor_payout_requests AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
        THROW 51110, ''Payout request history cannot be deleted.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
        WHERE NOT (
            (d.status = ''REQUESTED'' AND i.status IN (''APPROVED'', ''REJECTED''))
            OR (d.status = ''APPROVED'' AND i.status IN (''PAID'', ''REJECTED''))
        )
        OR d.mentor_id <> i.mentor_id OR d.amount <> i.amount
        OR d.bank_name <> i.bank_name OR d.account_name <> i.account_name
        OR d.account_number_ciphertext <> i.account_number_ciphertext
        OR d.account_last4 <> i.account_last4 OR d.requested_at <> i.requested_at
    )
        THROW 51111, ''Payout requests allow valid transitions (REQUESTED->APPROVED->PAID, or REJECTED) and immutable request details.'', 1;
END');

COMMIT TRANSACTION;
