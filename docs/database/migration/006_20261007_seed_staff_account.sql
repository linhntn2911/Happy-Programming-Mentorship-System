-- ============================================================================
-- HappyProgramming Mentorship System (HPMS)
-- Script: Seed Admin & Staff Accounts with Permissions
-- Target DB: HappyProgramming (SQL Server 2019/2022+)
-- Description: Creates an active ADMIN user (required by trigger trg_staff_permission_grant)
--              and an active STAFF user with all 4 operational permissions.
-- ============================================================================

USE [HappyProgramming];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

-- 1. Create System Admin account (Assigner required for Staff permissions)
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'admin@happyprogramming.vn')
BEGIN
    INSERT INTO dbo.users (
        email,
        role_code,
        password_hash,
        full_name,
        phone,
        bio,
        timezone,
        status,
        email_verified_at,
        created_at,
        updated_at
    ) VALUES (
        'admin@happyprogramming.vn',
        'ADMIN',
        '$2a$12$e0MYzXyjpJS7Pd0RVvHwHe1v5s1tQ/XkQpQk9Q.Nq7JgV8vY5Z6aK', -- Default password: Admin@123
        N'System Administrator',
        '0900000000',
        N'Platform System Administrator Account',
        'Asia/Ho_Chi_Minh',
        'ACTIVE',
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
    PRINT N'Created ADMIN user: admin@happyprogramming.vn (Password: Admin@123)';
END;

-- 2. Create Operational Staff account
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'staff@happyprogramming.vn')
BEGIN
    INSERT INTO dbo.users (
        email,
        role_code,
        password_hash,
        full_name,
        phone,
        bio,
        timezone,
        status,
        email_verified_at,
        created_at,
        updated_at
    ) VALUES (
        'staff@happyprogramming.vn',
        'STAFF',
        '$2a$12$e0MYzXyjpJS7Pd0RVvHwHe1v5s1tQ/XkQpQk9Q.Nq7JgV8vY5Z6aK', -- Default password: Staff@123
        N'Nguyen Van Staff',
        '0911111111',
        N'Platform Operational Staff Account',
        'Asia/Ho_Chi_Minh',
        'ACTIVE',
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
    PRINT N'Created STAFF user: staff@happyprogramming.vn (Password: Staff@123)';
END;

-- 3. Assign Staff Granular Permissions
DECLARE @admin_id BIGINT = (SELECT id FROM dbo.users WHERE email_normalized = 'admin@happyprogramming.vn');
DECLARE @staff_id BIGINT = (SELECT id FROM dbo.users WHERE email_normalized = 'staff@happyprogramming.vn');

IF @admin_id IS NOT NULL AND @staff_id IS NOT NULL
BEGIN
    INSERT INTO dbo.user_permissions (user_id, permission_code, assigned_by, assigned_at)
    SELECT @staff_id, p.code, @admin_id, SYSUTCDATETIME()
    FROM (VALUES 
        ('MENTOR_APPLICATION_MANAGE'),
        ('MENTEE_MANAGE'),
        ('MENTORSHIP_REQUEST_MANAGE'),
        ('SKILL_MANAGE')
    ) AS p(code)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.user_permissions 
        WHERE user_id = @staff_id AND permission_code = p.code
    );
    PRINT N'Granted 4 Staff permissions to staff@happyprogramming.vn assigned by admin@happyprogramming.vn';
END;

COMMIT TRANSACTION;
GO

-- Summary output
SELECT id, email, role_code, full_name, status, created_at FROM dbo.users WHERE role_code IN ('ADMIN', 'STAFF');
SELECT p.user_id, u.email, p.permission_code, a.email AS assigned_by_email, p.assigned_at 
FROM dbo.user_permissions p
JOIN dbo.users u ON u.id = p.user_id
JOIN dbo.users a ON a.id = p.assigned_by;
GO
