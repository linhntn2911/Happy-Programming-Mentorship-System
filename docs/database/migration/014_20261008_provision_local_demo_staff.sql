-- Explicit local-development provisioning only; never included in automatic Flyway startup.
-- Run sqlcmd against local HappyProgramming with HPMS_STAFF_HASH set to a generated BCrypt hash,
-- or run directly in SSMS (defaults to password: Staff@123).
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

BEGIN TRANSACTION;

IF DB_NAME() <> 'HappyProgramming' THROW 51030, 'Unexpected target database.', 1;

DECLARE @email NVARCHAR(254) = N'staff.demo@example.test';
DECLARE @hash VARCHAR(255) = '$(HPMS_STAFF_HASH)';

-- When executed directly in SSMS without sqlcmd variable replacement, use default BCrypt hash for Staff@123
IF @hash = '$(HPMS_STAFF_HASH)' OR @hash IS NULL OR @hash = ''
BEGIN
    SET @hash = '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW'; -- Default password: Staff@123
END;

IF LEN(@hash) <> 60 OR LEFT(@hash,4) <> '$2a$'
    THROW 51031, 'Supply a generated BCrypt hash.', 1;

IF EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE email_normalized=@email)
BEGIN
    UPDATE dbo.users
    SET password_hash = @hash,
        status = 'ACTIVE',
        updated_at = SYSUTCDATETIME()
    WHERE email_normalized = @email;
    PRINT N'Account staff.demo@example.test already exists; password hash refreshed.';
END
ELSE
BEGIN
    INSERT INTO dbo.users(email,full_name,first_name,last_name,password_hash,role_code,status,email_verified_at)
    VALUES(@email,N'Local Demo Staff',N'Local',N'Demo Staff',@hash,'STAFF','ACTIVE',SYSUTCDATETIME());

    DECLARE @id BIGINT = SCOPE_IDENTITY();
    INSERT INTO dbo.user_roles(user_id,role_code) VALUES(@id,'STAFF');

    -- Grant staff permissions assigned by admin
    DECLARE @admin_id BIGINT = (SELECT TOP 1 id FROM dbo.users WHERE role_code = 'ADMIN');
    IF @admin_id IS NOT NULL
    BEGIN
        INSERT INTO dbo.user_permissions (user_id, permission_code, assigned_by, assigned_at)
        VALUES 
            (@id, 'MENTOR_APPLICATION_MANAGE', @admin_id, SYSUTCDATETIME()),
            (@id, 'MENTEE_MANAGE', @admin_id, SYSUTCDATETIME()),
            (@id, 'MENTORSHIP_REQUEST_MANAGE', @admin_id, SYSUTCDATETIME()),
            (@id, 'SKILL_MANAGE', @admin_id, SYSUTCDATETIME());
    END;

    INSERT INTO dbo.audit_logs(actor_id,action,entity_type,entity_id,reason,ip_address)
    VALUES(@id,'LOCAL_STAFF_PROVISIONED','USER',CONVERT(VARCHAR(30),@id),N'User-requested local classroom demo account','127.0.0.1');

    PRINT N'Created demo staff: staff.demo@example.test with password Staff@123';
END;

COMMIT TRANSACTION;
