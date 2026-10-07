-- Extend profile levels without changing existing records or the init baseline.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.users') AND name='CK_users_level')
    ALTER TABLE dbo.users DROP CONSTRAINT CK_users_level;
ALTER TABLE dbo.users WITH CHECK ADD CONSTRAINT CK_users_level
    CHECK (experience_level IN ('BEGINNER','FRESHER','JUNIOR','MID','SENIOR'));
COMMIT;
