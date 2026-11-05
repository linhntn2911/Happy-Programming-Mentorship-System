-- Migration 030: Dispute management tables (Mentor-side UC: view dispute list/detail, provide dispute response).
-- Date: 2026-11-03
--
-- Purpose: persistent storage for mentee-submitted disputes and the mentor/staff response trail:
--   * dbo.disputes          - one dispute per booking or subscription target, lifecycle SUBMITTED -> IN_MEDIATION -> RESOLVED|REJECTED.
--   * dbo.dispute_responses - append-only explanation messages from either party or staff mediation.
--   * dbo.dispute_evidence  - append-only links to dbo.files uploaded as proof (images/documents).
--
-- Authorization note: the mentor is only the respondent. Resolution columns (resolution, resolved_by,
-- resolved_at, refund_id) are written exclusively by staff/admin flows; no mentor endpoint may set them.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.disputes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.disputes (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_disputes PRIMARY KEY,
        booking_id BIGINT NULL,
        subscription_id BIGINT NULL,
        complainant_id BIGINT NOT NULL,
        respondent_id BIGINT NOT NULL,
        reason_code VARCHAR(50) NOT NULL,
        description NVARCHAR(2000) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
        resolution VARCHAR(20) NULL,
        resolution_note NVARCHAR(1000) NULL,
        refund_id BIGINT NULL,
        resolved_by BIGINT NULL,
        resolved_at DATETIME2(3) NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_disputes_booking FOREIGN KEY(booking_id) REFERENCES dbo.bookings(id),
        CONSTRAINT FK_disputes_subscription FOREIGN KEY(subscription_id) REFERENCES dbo.subscriptions(id),
        CONSTRAINT FK_disputes_complainant FOREIGN KEY(complainant_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_disputes_respondent FOREIGN KEY(respondent_id) REFERENCES dbo.mentor_profiles(user_id),
        CONSTRAINT FK_disputes_refund FOREIGN KEY(refund_id) REFERENCES dbo.refunds(id),
        CONSTRAINT FK_disputes_resolver FOREIGN KEY(resolved_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_disputes_target CHECK (
            (booking_id IS NULL AND subscription_id IS NOT NULL)
            OR (booking_id IS NOT NULL AND subscription_id IS NULL)
        ),
        CONSTRAINT CK_disputes_parties CHECK (complainant_id <> respondent_id),
        CONSTRAINT CK_disputes_description CHECK (LEN(LTRIM(RTRIM(description))) BETWEEN 10 AND 2000),
        CONSTRAINT CK_disputes_status CHECK (status IN ('SUBMITTED','IN_MEDIATION','RESOLVED','REJECTED')),
        CONSTRAINT CK_disputes_resolution CHECK (resolution IS NULL OR resolution IN ('FULL_REFUND','PARTIAL_REFUND')),
        CONSTRAINT CK_disputes_resolved CHECK (
            status <> 'RESOLVED'
            OR (resolution IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
        ),
        CONSTRAINT CK_disputes_rejected CHECK (
            status <> 'REJECTED'
            OR (resolution IS NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
        ),
        CONSTRAINT CK_disputes_open CHECK (status IN ('SUBMITTED','IN_MEDIATION') OR resolved_at IS NOT NULL)
    );
END;

IF OBJECT_ID('dbo.dispute_responses', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.dispute_responses (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dispute_responses PRIMARY KEY,
        dispute_id BIGINT NOT NULL,
        author_id BIGINT NOT NULL,
        author_side VARCHAR(10) NOT NULL,
        message NVARCHAR(2000) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_dispute_responses_dispute FOREIGN KEY(dispute_id) REFERENCES dbo.disputes(id),
        CONSTRAINT FK_dispute_responses_author FOREIGN KEY(author_id) REFERENCES dbo.users(id),
        CONSTRAINT CK_dispute_responses_side CHECK (author_side IN ('MENTEE','MENTOR','STAFF')),
        CONSTRAINT CK_dispute_responses_message CHECK (LEN(LTRIM(RTRIM(message))) BETWEEN 5 AND 2000)
    );
END;

IF OBJECT_ID('dbo.dispute_evidence', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.dispute_evidence (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dispute_evidence PRIMARY KEY,
        dispute_id BIGINT NOT NULL,
        response_id BIGINT NULL,
        file_id BIGINT NOT NULL CONSTRAINT UQ_dispute_evidence_file UNIQUE,
        uploaded_by BIGINT NOT NULL,
        uploaded_side VARCHAR(10) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_dispute_evidence_dispute FOREIGN KEY(dispute_id) REFERENCES dbo.disputes(id),
        CONSTRAINT FK_dispute_evidence_response FOREIGN KEY(response_id) REFERENCES dbo.dispute_responses(id),
        CONSTRAINT FK_dispute_evidence_file FOREIGN KEY(file_id) REFERENCES dbo.files(id),
        CONSTRAINT FK_dispute_evidence_uploader FOREIGN KEY(uploaded_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_dispute_evidence_side CHECK (uploaded_side IN ('MENTEE','MENTOR','STAFF'))
    );
END;

-- Filtered indexes require QUOTED_IDENTIFIER ON (set above); guarded individually so the script is re-runnable.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_disputes_open_booking' AND object_id = OBJECT_ID('dbo.disputes'))
    CREATE UNIQUE INDEX UX_disputes_open_booking ON dbo.disputes(booking_id)
        WHERE booking_id IS NOT NULL AND status IN ('SUBMITTED','IN_MEDIATION');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_disputes_open_subscription' AND object_id = OBJECT_ID('dbo.disputes'))
    CREATE UNIQUE INDEX UX_disputes_open_subscription ON dbo.disputes(subscription_id)
        WHERE subscription_id IS NOT NULL AND status IN ('SUBMITTED','IN_MEDIATION');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_disputes_respondent' AND object_id = OBJECT_ID('dbo.disputes'))
    CREATE INDEX IX_disputes_respondent ON dbo.disputes(respondent_id, status, created_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_disputes_complainant' AND object_id = OBJECT_ID('dbo.disputes'))
    CREATE INDEX IX_disputes_complainant ON dbo.disputes(complainant_id, status, created_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dispute_responses_dispute' AND object_id = OBJECT_ID('dbo.dispute_responses'))
    CREATE INDEX IX_dispute_responses_dispute ON dbo.dispute_responses(dispute_id, created_at, id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dispute_evidence_dispute' AND object_id = OBJECT_ID('dbo.dispute_evidence'))
    CREATE INDEX IX_dispute_evidence_dispute ON dbo.dispute_evidence(dispute_id, id);

-- Evidence and responses form the audit trail reviewed by staff: they are append-only.
IF OBJECT_ID('dbo.trg_dispute_response_immutable', 'TR') IS NULL
BEGIN
    EXEC(N'CREATE TRIGGER dbo.trg_dispute_response_immutable ON dbo.dispute_responses
    AFTER UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        THROW 51301, ''Dispute responses are append-only and cannot be modified or deleted.'', 1;
    END;');
END;

IF OBJECT_ID('dbo.trg_dispute_evidence_immutable', 'TR') IS NULL
BEGIN
    EXEC(N'CREATE TRIGGER dbo.trg_dispute_evidence_immutable ON dbo.dispute_evidence
    AFTER UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        THROW 51302, ''Dispute evidence is append-only and cannot be modified or deleted.'', 1;
    END;');
END;
