SET XACT_ABORT ON;

/* SQL Server compiles a whole batch before executing it.  Add the columns in
   their own batch so subsequent statements can safely reference them. */
IF COL_LENGTH('dbo.conversations', 'conversation_type') IS NULL
    ALTER TABLE dbo.conversations ADD conversation_type VARCHAR(20) NULL;
IF COL_LENGTH('dbo.conversations', 'dispute_id') IS NULL
    ALTER TABLE dbo.conversations ADD dispute_id BIGINT NULL;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.conversations
    SET conversation_type = 'MENTORSHIP'
    WHERE conversation_type IS NULL;

    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.conversations') AND name = N'UQ_conversations_pair')
        ALTER TABLE dbo.conversations DROP CONSTRAINT UQ_conversations_pair;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.conversations') AND name = N'FK_conversations_dispute')
        ALTER TABLE dbo.conversations ADD CONSTRAINT FK_conversations_dispute
            FOREIGN KEY(dispute_id) REFERENCES dbo.disputes(id);

    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.conversations') AND name = N'CK_conversations_type')
        ALTER TABLE dbo.conversations DROP CONSTRAINT CK_conversations_type;
    ALTER TABLE dbo.conversations ADD CONSTRAINT CK_conversations_type CHECK (
        (conversation_type = 'MENTORSHIP' AND dispute_id IS NULL)
        OR (conversation_type = 'MEDIATION' AND dispute_id IS NOT NULL)
    );

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.conversations') AND name = N'UX_conversations_mentorship_pair')
        CREATE UNIQUE INDEX UX_conversations_mentorship_pair ON dbo.conversations(mentor_id, mentee_id)
        WHERE conversation_type = 'MENTORSHIP';
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.conversations') AND name = N'UX_conversations_dispute')
        CREATE UNIQUE INDEX UX_conversations_dispute ON dbo.conversations(dispute_id)
        WHERE dispute_id IS NOT NULL;

    /* Existing official notices are moved out of the learning workspace. */
    INSERT INTO dbo.conversations(mentor_id, mentee_id, conversation_type, dispute_id, inquiry_status, created_at, updated_at)
    SELECT d.respondent_id, d.complainant_id, 'MEDIATION', d.id, 'APPROVED', SYSUTCDATETIME(), SYSUTCDATETIME()
    FROM dbo.disputes d
    WHERE EXISTS (
        SELECT 1 FROM dbo.messages m
        JOIN dbo.conversations c ON c.id = m.conversation_id
        WHERE c.mentor_id = d.respondent_id AND c.mentee_id = d.complainant_id
          AND m.body LIKE N'%OFFICIAL DISPUTE MEDIATION NOTICE - CASE #' + d.ticket_code + N'%'
    )
    AND NOT EXISTS (SELECT 1 FROM dbo.conversations c WHERE c.dispute_id = d.id);

    UPDATE c SET mentor_last_read_message_id = NULL
    FROM dbo.conversations c
    JOIN dbo.messages m ON m.id = c.mentor_last_read_message_id
    JOIN dbo.disputes d ON c.mentor_id = d.respondent_id AND c.mentee_id = d.complainant_id
    WHERE c.conversation_type = 'MENTORSHIP'
      AND m.body LIKE N'%OFFICIAL DISPUTE MEDIATION NOTICE - CASE #' + d.ticket_code + N'%';
    UPDATE c SET mentee_last_read_message_id = NULL
    FROM dbo.conversations c
    JOIN dbo.messages m ON m.id = c.mentee_last_read_message_id
    JOIN dbo.disputes d ON c.mentor_id = d.respondent_id AND c.mentee_id = d.complainant_id
    WHERE c.conversation_type = 'MENTORSHIP'
      AND m.body LIKE N'%OFFICIAL DISPUTE MEDIATION NOTICE - CASE #' + d.ticket_code + N'%';

    UPDATE m SET conversation_id = mediation.id
    FROM dbo.messages m
    JOIN dbo.conversations learning ON learning.id = m.conversation_id AND learning.conversation_type = 'MENTORSHIP'
    JOIN dbo.disputes d ON learning.mentor_id = d.respondent_id AND learning.mentee_id = d.complainant_id
    JOIN dbo.conversations mediation ON mediation.dispute_id = d.id AND mediation.conversation_type = 'MEDIATION'
    WHERE m.body LIKE N'%OFFICIAL DISPUTE MEDIATION NOTICE - CASE #' + d.ticket_code + N'%';

    UPDATE c
    SET last_message_at = (SELECT MAX(m.sent_at) FROM dbo.messages m WHERE m.conversation_id = c.id),
        updated_at = SYSUTCDATETIME()
    FROM dbo.conversations c;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
