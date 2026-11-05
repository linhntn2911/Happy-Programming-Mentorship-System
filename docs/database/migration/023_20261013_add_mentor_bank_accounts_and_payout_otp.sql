-- Saved mentor payout bank accounts and PAYOUT OTP purpose for withdrawal verification.
-- Idempotent so it is safe against partial or manually reconciled databases.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.mentor_bank_accounts', N'U') IS NULL
EXEC(N'CREATE TABLE dbo.mentor_bank_accounts (
    mentor_id BIGINT NOT NULL CONSTRAINT PK_mentor_bank_accounts PRIMARY KEY,
    bank_name NVARCHAR(100) NOT NULL,
    account_name NVARCHAR(150) NOT NULL,
    account_number_ciphertext NVARCHAR(500) NOT NULL,
    account_last4 CHAR(4) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_bank_accounts_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_bank_accounts_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_mentor_bank_accounts_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id)
)');

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.security_tokens') AND name=N'CK_security_tokens_purpose')
    ALTER TABLE dbo.security_tokens DROP CONSTRAINT CK_security_tokens_purpose;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.security_tokens') AND name=N'CK_security_tokens_purpose')
    EXEC(N'ALTER TABLE dbo.security_tokens ADD CONSTRAINT CK_security_tokens_purpose
        CHECK (purpose IN (''VERIFY_EMAIL'',''RESET_PASSWORD'',''PAYOUT''))');

COMMIT TRANSACTION;
