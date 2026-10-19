SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE c
    SET inquiry_status = 'APPROVED',
        updated_at = SYSUTCDATETIME()
    FROM dbo.conversations c
    WHERE c.inquiry_status <> 'APPROVED'
      AND EXISTS (
          SELECT 1
          FROM dbo.bookings b
          WHERE b.mentor_id = c.mentor_id
            AND b.mentee_id = c.mentee_id
            AND b.service_type = 'ONE_OFF'
            AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW_REVIEW','NO_SHOW')
      );

    INSERT INTO dbo.conversations(
        mentor_id, mentee_id, inquiry_status, created_at, updated_at)
    SELECT paid_pairs.mentor_id, paid_pairs.mentee_id, 'APPROVED',
           SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM (
        SELECT DISTINCT mentor_id, mentee_id
        FROM dbo.bookings
        WHERE service_type = 'ONE_OFF'
          AND status IN ('CONFIRMED','COMPLETED','NO_SHOW_REVIEW','NO_SHOW')
    ) paid_pairs
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.conversations c WITH (UPDLOCK, HOLDLOCK)
        WHERE c.mentor_id = paid_pairs.mentor_id
          AND c.mentee_id = paid_pairs.mentee_id
    );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
