-- Reconcile wallet schema objects that may already exist from a manually run or partial script.
-- This is packaged as V13 so it runs before the wallet schema has a Flyway history entry.
-- Existing rows and objects are preserved.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_type')
    ALTER TABLE dbo.escrow_ledger_entries DROP CONSTRAINT CK_escrow_type;
ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_type
    CHECK (entry_type IN ('HOLD','REFUND_OUT','MENTOR_RELEASE','PLATFORM_FEE','MENTOR_PAYOUT'));

IF OBJECT_ID(N'dbo.mentor_payout_requests', N'U') IS NULL
EXEC(N'CREATE TABLE dbo.mentor_payout_requests (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_mentor_payout_requests PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    bank_name NVARCHAR(100) NOT NULL,
    account_name NVARCHAR(150) NOT NULL,
    account_number_ciphertext NVARCHAR(500) NOT NULL,
    account_last4 CHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL CONSTRAINT DF_mentor_payout_requests_status DEFAULT ''REQUESTED'',
    transfer_reference NVARCHAR(150) NULL,
    rejection_reason NVARCHAR(500) NULL,
    reviewed_by BIGINT NULL,
    requested_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_payout_requests_requested_at DEFAULT SYSUTCDATETIME(),
    reviewed_at DATETIME2(3) NULL,
    CONSTRAINT FK_mentor_payout_requests_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT FK_mentor_payout_requests_reviewer FOREIGN KEY(reviewed_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_mentor_payout_requests_amount CHECK (amount > 0),
    CONSTRAINT CK_mentor_payout_requests_status CHECK (status IN (''REQUESTED'',''PAID'',''REJECTED'')),
    CONSTRAINT CK_mentor_payout_requests_review CHECK (
        (status = ''REQUESTED'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
        OR (status = ''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)), '''') IS NOT NULL AND rejection_reason IS NULL)
        OR (status = ''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)), '''') IS NOT NULL AND transfer_reference IS NULL)
    )
);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.mentor_payout_requests') AND name=N'IX_mentor_payout_requests_mentor')
    EXEC(N'CREATE INDEX IX_mentor_payout_requests_mentor ON dbo.mentor_payout_requests(mentor_id, requested_at DESC)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.mentor_payout_requests') AND name=N'IX_mentor_payout_requests_queue')
    EXEC(N'CREATE INDEX IX_mentor_payout_requests_queue ON dbo.mentor_payout_requests(status, requested_at, id)');

IF COL_LENGTH(N'dbo.escrow_ledger_entries', N'payout_request_id') IS NULL
    ALTER TABLE dbo.escrow_ledger_entries ADD payout_request_id BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'FK_escrow_payout_request')
    EXEC(N'ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT FK_escrow_payout_request
        FOREIGN KEY(payout_request_id) REFERENCES dbo.mentor_payout_requests(id)');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_payout_reference')
    EXEC(N'ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_payout_reference
    CHECK ((entry_type = ''MENTOR_PAYOUT'' AND payout_request_id IS NOT NULL)
        OR (entry_type <> ''MENTOR_PAYOUT'' AND payout_request_id IS NULL))');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'IX_escrow_payout_request')
    EXEC(N'CREATE INDEX IX_escrow_payout_request ON dbo.escrow_ledger_entries(payout_request_id)
        WHERE payout_request_id IS NOT NULL');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'UX_escrow_mentor_release')
    EXEC(N'CREATE UNIQUE INDEX UX_escrow_mentor_release ON dbo.escrow_ledger_entries(payment_id)
        WHERE entry_type = ''MENTOR_RELEASE'' AND reversal_of_id IS NULL');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'UX_escrow_platform_fee')
    EXEC(N'CREATE UNIQUE INDEX UX_escrow_platform_fee ON dbo.escrow_ledger_entries(payment_id)
        WHERE entry_type = ''PLATFORM_FEE'' AND reversal_of_id IS NULL');

EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_mentor_payout_request_lifecycle
ON dbo.mentor_payout_requests AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
        THROW 51110, ''Payout request history cannot be deleted.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
        WHERE d.status <> ''REQUESTED'' OR i.status NOT IN (''PAID'',''REJECTED'')
           OR d.mentor_id <> i.mentor_id OR d.amount <> i.amount
           OR d.bank_name <> i.bank_name OR d.account_name <> i.account_name
           OR d.account_number_ciphertext <> i.account_number_ciphertext
           OR d.account_last4 <> i.account_last4 OR d.requested_at <> i.requested_at
    )
        THROW 51111, ''Payout requests allow one terminal decision and immutable request details.'', 1;
END');

COMMIT TRANSACTION;
