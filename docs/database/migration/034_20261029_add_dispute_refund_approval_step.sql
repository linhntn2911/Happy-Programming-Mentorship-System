SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add approved_by and approved_at columns to disputes
IF COL_LENGTH('dbo.disputes', 'approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD approved_by BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_approver
        FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.disputes', 'approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD approved_at DATETIME2(3) NULL;
END;

-- Add reviewed_by and transfer_reference columns for Admin payout execution
IF COL_LENGTH('dbo.disputes', 'reviewed_by') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD reviewed_by BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.disputes', 'transfer_reference') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD transfer_reference VARCHAR(150) NULL;
END;

-- Add bank details columns for refund destination
IF COL_LENGTH('dbo.disputes', 'bank_name') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD bank_name VARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.disputes', 'account_number') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD account_number VARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.disputes', 'account_name') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD account_name NVARCHAR(150) NULL;
END;

-- Update status check constraint to allow APPROVED
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_disputes_status')
    ALTER TABLE dbo.disputes DROP CONSTRAINT CK_disputes_status;

ALTER TABLE dbo.disputes ADD CONSTRAINT CK_disputes_status
    CHECK (status IN ('SUBMITTED', 'IN_MEDIATION', 'AWAITING_EVIDENCE', 'APPROVED', 'RESOLVED', 'REJECTED'));

COMMIT TRANSACTION;

