SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.disputes', N'U') IS NULL
    THROW 50001, 'dbo.disputes is missing. Run the dispute base migrations before migration 045.', 1;

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.disputes', 'resolution_deadline_at') IS NULL
BEGIN
    EXEC(N'ALTER TABLE dbo.disputes ADD resolution_deadline_at DATETIME2(3) NULL;');
END;

EXEC sys.sp_executesql N'
    UPDATE dbo.disputes
    SET response_deadline_at = DATEADD(HOUR, 24, created_at),
        resolution_deadline_at = DATEADD(HOUR, 48, created_at)
    WHERE created_at IS NOT NULL;';

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.disputes')
      AND name = 'IX_disputes_response_deadline'
)
BEGIN
    CREATE INDEX IX_disputes_response_deadline
        ON dbo.disputes(status, response_deadline_at)
        INCLUDE (ticket_code, respondent_id, assigned_staff_id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.disputes')
      AND name = 'IX_disputes_resolution_deadline'
)
BEGIN
    EXEC(N'CREATE INDEX IX_disputes_resolution_deadline
        ON dbo.disputes(status, resolution_deadline_at)
        INCLUDE (ticket_code, respondent_id, assigned_staff_id);');
END;

COMMIT TRANSACTION;
