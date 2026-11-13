-- Migration 042: Seed synthetic disputes for the local development mentor (Mentor dispute UI walkthrough).
-- Date: 2026-11-05
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() NOT LIKE '%Dev%'
   AND DB_NAME() NOT LIKE '%Test%'
   AND DB_NAME() NOT LIKE '%Local%'
   AND DB_NAME() NOT LIKE '%HappyProgramming%'
    THROW 51000,'Development or isolated test database required.',1;

IF OBJECT_ID('dbo.disputes', 'U') IS NULL
    THROW 51004,'Apply dispute tables migration before running this seed.',1;

DECLARE @mentorId BIGINT;
SELECT @mentorId = id FROM dbo.users WITH (UPDLOCK,HOLDLOCK)
WHERE email_normalized = 'nt1414856@gmail.com' AND status = 'ACTIVE';

IF @mentorId IS NULL THROW 51001,'Target active mentor account was not found.',1;

DECLARE @resolverId BIGINT;
SELECT TOP 1 @resolverId = id FROM dbo.users
WHERE role_code IN ('STAFF','ADMIN') AND status = 'ACTIVE' ORDER BY id;

IF @resolverId IS NULL THROW 51002,'A staff or admin account is required to seed resolved disputes.',1;

IF NOT EXISTS (SELECT 1 FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-1')
    THROW 51003,'Apply dev mentor feedback seed before running this seed.',1;

-- Idempotency guard: keyed off the first synthetic dispute target.
IF NOT EXISTS (
    SELECT 1 FROM dbo.disputes d JOIN dbo.bookings b ON b.id = d.booking_id
    WHERE b.booking_code = 'DEV-FB-ONEOFF-1' AND d.respondent_id = @mentorId)
BEGIN
    BEGIN TRANSACTION;

    DECLARE @booking1 BIGINT = (SELECT id FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-1');
    DECLARE @booking2 BIGINT = (SELECT id FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-2');
    DECLARE @booking3 BIGINT = (SELECT id FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-3');
    DECLARE @booking4 BIGINT = (SELECT id FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-4');
    DECLARE @mentee1 BIGINT = (SELECT mentee_id FROM dbo.bookings WHERE id = @booking1);
    DECLARE @mentee2 BIGINT = (SELECT mentee_id FROM dbo.bookings WHERE id = @booking2);
    DECLARE @mentee3 BIGINT = (SELECT mentee_id FROM dbo.bookings WHERE id = @booking3);
    DECLARE @mentee4 BIGINT = (SELECT mentee_id FROM dbo.bookings WHERE id = @booking4);

    ----------------------------------------------------------------------------------------
    -- 1. SUBMITTED dispute on booking 1 with mentee evidence awaiting the mentor response.
    ----------------------------------------------------------------------------------------
    DECLARE @newIds TABLE (id BIGINT);
    DECLARE @dispute1 BIGINT;
    INSERT INTO dbo.disputes (booking_id, complainant_id, respondent_id, reason_code, description, status, created_at, updated_at)
    OUTPUT INSERTED.id INTO @newIds
    VALUES (@booking1, @mentee1, @mentorId, 'NO_SHOW',
            N'Mentor did not join the scheduled session and did not reply in the workspace chat. I would like a refund for this one-off session.',
            'SUBMITTED', DATEADD(DAY,-4,SYSUTCDATETIME()), DATEADD(DAY,-4,SYSUTCDATETIME()));
    SELECT @dispute1 = id FROM @newIds;

    INSERT INTO dbo.files (uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum,
                           file_content, visibility, status, created_at, updated_at)
    VALUES (@mentee1, 'session-screenshot.txt', 'disputes/seed/dev-dsp-1-mentee.txt', 'text/plain',
            DATALENGTH(CAST(N'Waiting room screenshot log: session started 19:00, mentor never joined.' AS VARBINARY(MAX))),
            NULL, CAST(N'Waiting room screenshot log: session started 19:00, mentor never joined.' AS VARBINARY(MAX)),
            'AUTHORIZED', 'READY', DATEADD(DAY,-4,SYSUTCDATETIME()), DATEADD(DAY,-4,SYSUTCDATETIME()));

    INSERT INTO dbo.dispute_evidence (dispute_id, response_id, file_id, uploaded_by, uploaded_side, created_at)
    SELECT @dispute1, NULL, id, @mentee1, 'MENTEE', DATEADD(DAY,-4,SYSUTCDATETIME())
    FROM dbo.files WHERE storage_key = 'disputes/seed/dev-dsp-1-mentee.txt';

    ----------------------------------------------------------------------------------------
    -- 2. IN_MEDIATION dispute on booking 2: mentee evidence plus an existing mentor response.
    ----------------------------------------------------------------------------------------
    DELETE FROM @newIds;
    DECLARE @dispute2 BIGINT;
    INSERT INTO dbo.disputes (booking_id, complainant_id, respondent_id, reason_code, description, status, created_at, updated_at)
    OUTPUT INSERTED.id INTO @newIds
    VALUES (@booking2, @mentee2, @mentorId, 'QUALITY',
            N'The session covered topics outside the agreed agenda and the recording promised in the package was never shared.',
            'IN_MEDIATION', DATEADD(DAY,-11,SYSUTCDATETIME()), DATEADD(DAY,-9,SYSUTCDATETIME()));
    SELECT @dispute2 = id FROM @newIds;

    INSERT INTO dbo.files (uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum,
                           file_content, visibility, status, created_at, updated_at)
    VALUES (@mentee2, 'agenda-mismatch.txt', 'disputes/seed/dev-dsp-2-mentee.txt', 'text/plain',
            DATALENGTH(CAST(N'Agreed agenda: system design interview prep. Actual session: resume formatting.' AS VARBINARY(MAX))),
            NULL, CAST(N'Agreed agenda: system design interview prep. Actual session: resume formatting.' AS VARBINARY(MAX)),
            'AUTHORIZED', 'READY', DATEADD(DAY,-11,SYSUTCDATETIME()), DATEADD(DAY,-11,SYSUTCDATETIME()));

    INSERT INTO dbo.dispute_evidence (dispute_id, response_id, file_id, uploaded_by, uploaded_side, created_at)
    SELECT @dispute2, NULL, id, @mentee2, 'MENTEE', DATEADD(DAY,-11,SYSUTCDATETIME())
    FROM dbo.files WHERE storage_key = 'disputes/seed/dev-dsp-2-mentee.txt';

    DELETE FROM @newIds;
    DECLARE @response2 BIGINT;
    INSERT INTO dbo.dispute_responses (dispute_id, author_id, author_side, message, created_at)
    OUTPUT INSERTED.id INTO @newIds
    VALUES (@dispute2, @mentorId, 'MENTOR',
            N'I covered resume formatting because the mentee asked for it at the start of the call. The recording was uploaded to the workspace two days later; attaching the export log for staff review.',
            DATEADD(DAY,-9,SYSUTCDATETIME()));
    SELECT @response2 = id FROM @newIds;

    INSERT INTO dbo.files (uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum,
                           file_content, visibility, status, created_at, updated_at)
    VALUES (@mentorId, 'recording-export-log.txt', 'disputes/seed/dev-dsp-2-mentor.txt', 'text/plain',
            DATALENGTH(CAST(N'Export log: recording shared to workspace conversation on the following day at 09:12.' AS VARBINARY(MAX))),
            NULL, CAST(N'Export log: recording shared to workspace conversation on the following day at 09:12.' AS VARBINARY(MAX)),
            'AUTHORIZED', 'READY', DATEADD(DAY,-9,SYSUTCDATETIME()), DATEADD(DAY,-9,SYSUTCDATETIME()));

    INSERT INTO dbo.dispute_evidence (dispute_id, response_id, file_id, uploaded_by, uploaded_side, created_at)
    SELECT @dispute2, @response2, id, @mentorId, 'MENTOR', DATEADD(DAY,-9,SYSUTCDATETIME())
    FROM dbo.files WHERE storage_key = 'disputes/seed/dev-dsp-2-mentor.txt';

    ----------------------------------------------------------------------------------------
    -- 3. RESOLVED (full refund) dispute on booking 3, decided by staff.
    ----------------------------------------------------------------------------------------
    INSERT INTO dbo.disputes (booking_id, complainant_id, respondent_id, reason_code, description, status,
                             resolution, resolution_note, resolved_by, resolved_at, created_at, updated_at)
    VALUES (@booking3, @mentee3, @mentorId, 'SCHEDULING',
            N'The session was rescheduled three times by the mentor and finally cancelled without a replacement slot.',
            'RESOLVED', 'FULL_REFUND',
            N'Staff confirmed the mentor cancelled inside 24 hours without offering a replacement slot. Full refund approved.',
            @resolverId, DATEADD(DAY,-17,SYSUTCDATETIME()), DATEADD(DAY,-19,SYSUTCDATETIME()), DATEADD(DAY,-17,SYSUTCDATETIME()));

    ----------------------------------------------------------------------------------------
    -- 4. REJECTED dispute on booking 4, decided by staff.
    ----------------------------------------------------------------------------------------
    INSERT INTO dbo.disputes (booking_id, complainant_id, respondent_id, reason_code, description, status,
                             resolution_note, resolved_by, resolved_at, created_at, updated_at)
    VALUES (@booking4, @mentee4, @mentorId, 'OTHER',
            N'I want a refund because I changed my mind about the learning goal after the session was completed.',
            'REJECTED',
            N'Session was delivered and completed as booked. Change of mind is not covered by the refund policy.',
            @resolverId, DATEADD(DAY,-24,SYSUTCDATETIME()), DATEADD(DAY,-25,SYSUTCDATETIME()), DATEADD(DAY,-24,SYSUTCDATETIME()));

    COMMIT TRANSACTION;
    PRINT N'Seeded 4 development disputes (SUBMITTED, IN_MEDIATION, RESOLVED, REJECTED) for the mentor dispute UI.';
END;

