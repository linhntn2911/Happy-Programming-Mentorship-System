-- ============================================================================
-- HappyProgramming Mentorship System (HPMS)
-- Migration: 007_20261008_fix_staff_admin_passwords.sql
-- Description: Updates the BCrypt password hash for seeded Staff and Admin accounts
--              to match their documented default passwords:
--              - staff@happyprogramming.vn -> Staff@123
--              - admin@happyprogramming.vn -> Admin@123
--              Also resets failed_login_count and locked_until in case of previous lockouts.
-- ============================================================================

USE [HappyProgramming];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

-- 1. Update Staff password to match 'Staff@123'
IF EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'staff@happyprogramming.vn')
BEGIN
    UPDATE dbo.users
    SET password_hash = '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW', -- Staff@123
        status = 'ACTIVE',
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE email_normalized = 'staff@happyprogramming.vn';

    PRINT N'Successfully updated password for staff@happyprogramming.vn to Staff@123';
END;

-- 2. Update Admin password to match 'Admin@123'
IF EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'admin@happyprogramming.vn')
BEGIN
    UPDATE dbo.users
    SET password_hash = '$2a$12$uBvGINEQ9Bikd5Op33kFuO9X5h2cebsUcdgUmFoXZiECQbhCuBdAu', -- Admin@123
        status = 'ACTIVE',
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE email_normalized = 'admin@happyprogramming.vn';

    PRINT N'Successfully updated password for admin@happyprogramming.vn to Admin@123';
END;

COMMIT TRANSACTION;
GO
