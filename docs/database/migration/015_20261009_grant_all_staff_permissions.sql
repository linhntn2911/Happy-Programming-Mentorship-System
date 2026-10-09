-- ============================================================================
-- HappyProgramming Mentorship System (HPMS)
-- Migration: 015_20261009_grant_all_staff_permissions.sql
-- Description: Ensures all active STAFF accounts receive the complete set of 4 
--              granular staff permissions:
--              - MENTOR_APPLICATION_MANAGE
--              - MENTEE_MANAGE
--              - MENTORSHIP_REQUEST_MANAGE
--              - SKILL_MANAGE
-- ============================================================================

USE [HappyProgramming];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

DECLARE @admin_id BIGINT = (SELECT TOP 1 id FROM dbo.users WHERE role_code = 'ADMIN');

IF @admin_id IS NOT NULL
BEGIN
    INSERT INTO dbo.user_permissions (user_id, permission_code, assigned_by, assigned_at)
    SELECT u.id, p.code, @admin_id, SYSUTCDATETIME()
    FROM dbo.users u
    CROSS JOIN (VALUES 
        ('MENTOR_APPLICATION_MANAGE'),
        ('MENTEE_MANAGE'),
        ('MENTORSHIP_REQUEST_MANAGE'),
        ('SKILL_MANAGE')
    ) AS p(code)
    WHERE (u.role_code = 'STAFF' OR EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id = u.id AND r.role_code = 'STAFF'))
      AND NOT EXISTS (
          SELECT 1 FROM dbo.user_permissions 
          WHERE user_id = u.id AND permission_code = p.code
      );

    PRINT N'Granted complete staff permissions to all staff accounts.';
END;

COMMIT TRANSACTION;
GO
