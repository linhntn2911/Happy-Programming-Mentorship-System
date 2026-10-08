-- Explicit local-development provisioning only; never included in automatic Flyway startup.
-- Run sqlcmd against local HappyProgramming with HPMS_STAFF_HASH set to a generated BCrypt hash.
-- Refuses to replace or elevate an existing account. Re-running does not reset credentials.
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
IF LEN(@hash) <> 60 OR LEFT(@hash,4) <> '$2a$'
    THROW 51031, 'Supply a generated BCrypt hash.', 1;
IF EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE email_normalized=@email)
    THROW 51032, 'Account exists; no changes applied.', 1;
INSERT INTO dbo.users(email,full_name,first_name,last_name,password_hash,role_code,status,email_verified_at)
VALUES(@email,N'Local Demo Staff',N'Local',N'Demo Staff',@hash,'STAFF','ACTIVE',SYSUTCDATETIME());
DECLARE @id BIGINT = SCOPE_IDENTITY();
INSERT INTO dbo.user_roles(user_id,role_code) VALUES(@id,'STAFF');
INSERT INTO dbo.audit_logs(actor_id,action,entity_type,entity_id,reason,ip_address)
VALUES(@id,'LOCAL_STAFF_PROVISIONED','USER',CONVERT(VARCHAR(30),@id),N'User-requested local classroom demo account','127.0.0.1');
COMMIT;
