-- Matches backend/src/main/resources/db/migration/V2__admin_audit_integrity.sql.
-- Apply via Flyway during backend startup; rerunning is safe.
IF COL_LENGTH('dbo.audit_logs', 'ip_address') IS NULL
    ALTER TABLE dbo.audit_logs ADD ip_address VARCHAR(45) NULL;
GO
CREATE OR ALTER TRIGGER dbo.trg_audit_logs_immutable
ON dbo.audit_logs INSTEAD OF UPDATE, DELETE
AS
BEGIN
    THROW 51020, 'Audit records are immutable.', 1;
END;
