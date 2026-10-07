-- Additive My profile migration. No baseline/real data changes.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.users', 'learning_goals') IS NULL
    ALTER TABLE dbo.users ADD learning_goals NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.files', 'avatar_content') IS NULL
    ALTER TABLE dbo.files ADD avatar_content VARBINARY(MAX) NULL;
COMMIT;
