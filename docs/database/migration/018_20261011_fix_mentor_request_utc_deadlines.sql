-- Correct pending mentorship requests whose submitted_at was stored in Vietnam local time
-- as if it were UTC by JDBC Timestamp binding. Future submitted_at values are impossible
-- for a real request; the observed local offset is UTC+7. The lifecycle trigger remains
-- enabled after this atomic, narrowly-scoped correction.
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @now_utc DATETIME2(3) = SYSUTCDATETIME();

    DISABLE TRIGGER dbo.trg_request_approval_flow ON dbo.mentorship_requests;

    UPDATE dbo.mentorship_requests
    SET submitted_at = DATEADD(HOUR, -7, submitted_at),
        response_deadline = DATEADD(HOUR, -7, response_deadline),
        terms_accepted_at = CASE WHEN terms_accepted_at IS NULL THEN NULL ELSE DATEADD(HOUR, -7, terms_accepted_at) END,
        created_at = DATEADD(HOUR, -7, created_at),
        updated_at = DATEADD(HOUR, -7, updated_at)
    WHERE status = 'PENDING'
      AND submitted_at > @now_utc
      AND submitted_at <= DATEADD(HOUR, 8, @now_utc);

    ENABLE TRIGGER dbo.trg_request_approval_flow ON dbo.mentorship_requests;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;