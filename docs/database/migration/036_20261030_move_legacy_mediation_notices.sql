SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    /* Move legacy Staff mediation notices out of the learning conversation.
       Ordinary mentor/mentee learning messages remain in the mentorship room. */
    UPDATE learning SET mentor_last_read_message_id = NULL
    FROM dbo.conversations learning
    JOIN dbo.messages m ON m.id = learning.mentor_last_read_message_id
    WHERE learning.conversation_type = 'MENTORSHIP'
      AND (m.body LIKE N'%OFFICIAL%DISPUTE%MEDIATION%'
           OR m.client_message_key LIKE 'MEDIATION_NOTICE_%');

    UPDATE learning SET mentee_last_read_message_id = NULL
    FROM dbo.conversations learning
    JOIN dbo.messages m ON m.id = learning.mentee_last_read_message_id
    WHERE learning.conversation_type = 'MENTORSHIP'
      AND (m.body LIKE N'%OFFICIAL%DISPUTE%MEDIATION%'
           OR m.client_message_key LIKE 'MEDIATION_NOTICE_%');

    UPDATE m SET conversation_id = mediation.id
    FROM dbo.messages m
    JOIN dbo.conversations learning
      ON learning.id = m.conversation_id AND learning.conversation_type = 'MENTORSHIP'
    JOIN dbo.disputes d
      ON d.respondent_id = learning.mentor_id AND d.complainant_id = learning.mentee_id
    JOIN dbo.conversations mediation
      ON mediation.dispute_id = d.id AND mediation.conversation_type = 'MEDIATION'
    WHERE ((m.body LIKE N'%OFFICIAL%DISPUTE%MEDIATION%'
            AND m.body LIKE N'%' + d.ticket_code + N'%')
           OR m.client_message_key LIKE 'MEDIATION_NOTICE_' + d.ticket_code + '%');

    UPDATE c
    SET last_message_at = (SELECT MAX(m.sent_at) FROM dbo.messages m WHERE m.conversation_id = c.id),
        updated_at = SYSUTCDATETIME()
    FROM dbo.conversations c
    WHERE c.conversation_type IN ('MENTORSHIP', 'MEDIATION');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
