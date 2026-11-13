SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    /* V25 split future rooms by dispute.  This backfills any existing open
       dispute that was created before the split and therefore has no room. */
    INSERT INTO dbo.conversations(
        mentor_id, mentee_id, conversation_type, dispute_id,
        inquiry_status, created_at, updated_at)
    SELECT d.respondent_id, d.complainant_id, 'MEDIATION', d.id,
           'APPROVED', SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM dbo.disputes d
    WHERE d.status IN ('SUBMITTED', 'IN_MEDIATION', 'AWAITING_EVIDENCE', 'APPROVED')
      AND NOT EXISTS (
          SELECT 1 FROM dbo.conversations c WITH (UPDLOCK, HOLDLOCK)
          WHERE c.dispute_id = d.id AND c.conversation_type = 'MEDIATION'
      );

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
