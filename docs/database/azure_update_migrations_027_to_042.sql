SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;


-- =============================================
-- Migration: 027_20261015_add_availability_slot_indexes.sql
-- =============================================
-- Supporting indexes for the in-app mentor availability, conflict checking and slot-hold
-- query paths (HÆ°á»›ng C). The baseline tables availability_exceptions and slot_holds already
-- carry the correct CHECK constraints (slot_holds.status IN ('HELD','CONVERTED','RELEASED','EXPIRED')),
-- so this migration only adds non-clustered indexes to keep overlap and expiry scans efficient.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_availability_exceptions_mentor_time'
      AND object_id = OBJECT_ID('dbo.availability_exceptions')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_availability_exceptions_mentor_time
        ON dbo.availability_exceptions(mentor_id, exception_type, start_at, end_at);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_slot_holds_mentor_status_time'
      AND object_id = OBJECT_ID('dbo.slot_holds')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_slot_holds_mentor_status_time
        ON dbo.slot_holds(mentor_id, status, start_at, end_at);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_slot_holds_status_expires'
      AND object_id = OBJECT_ID('dbo.slot_holds')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_slot_holds_status_expires
        ON dbo.slot_holds(status, expires_at);
END

COMMIT TRANSACTION;


-- =============================================
-- Migration: 028_20261015_enable_instant_one_off_checkout.sql
-- =============================================
-- Migration 028: Allow one-off orders to enter checkout without mentor review.
-- Monthly mentorship keeps the existing 48-hour approval-first lifecycle.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_deadline;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_response;

-- Close legacy approval-first one-off requests that have no slot hold, then remove their obsolete
-- mentor-response deadline. They cannot be converted safely into instant bookings retroactively.
UPDATE dbo.mentorship_requests
SET status = 'CANCELLED',
    cancelled_at = COALESCE(cancelled_at, SYSUTCDATETIME()),
    cancellation_reason = COALESCE(cancellation_reason,
        N'Legacy one-off request closed when instant checkout was enabled.'),
    response_deadline = NULL,
    updated_at = SYSUTCDATETIME()
WHERE service_type = 'ONE_OFF' AND funded_at IS NULL AND status IN ('PENDING','ACCEPTED')
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.slot_holds h
      WHERE h.id = TRY_CONVERT(BIGINT, JSON_VALUE(dbo.mentorship_requests.offer_snapshot, '$.slotHoldId'))
        AND h.mentee_id = dbo.mentorship_requests.mentee_id
        AND h.mentor_id = dbo.mentorship_requests.mentor_id
        AND h.service_id = dbo.mentorship_requests.service_id
        AND h.service_type = 'ONE_OFF'
        AND h.status = 'HELD'
  );

UPDATE dbo.mentorship_requests
SET response_deadline = NULL, updated_at = SYSUTCDATETIME()
WHERE service_type = 'ONE_OFF' AND response_deadline IS NOT NULL;

ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_deadline CHECK (
    (service_type = 'ONE_OFF' AND (
        (status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL)
        OR (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NULL)
    ))
    OR
    (service_type = 'MONTHLY' AND (
        (status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL)
        OR
        (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NOT NULL
            AND response_deadline = DATEADD(HOUR,48,submitted_at))
    ))
);

ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_response CHECK (
    (service_type = 'ONE_OFF' AND status = 'DRAFT'
        AND submitted_at IS NULL AND responded_at IS NULL)
    OR
    (service_type = 'ONE_OFF' AND status = 'ACCEPTED'
        AND responded_at IS NOT NULL AND submitted_at IS NOT NULL AND responded_at >= submitted_at)
    OR
    (service_type = 'ONE_OFF' AND status IN ('PENDING','EXPIRED')
        AND submitted_at IS NOT NULL AND responded_at IS NULL)
    OR
    (service_type = 'ONE_OFF' AND status = 'REJECTED'
        AND submitted_at IS NOT NULL AND responded_at IS NOT NULL AND responded_at >= submitted_at)
    OR
    (service_type = 'MONTHLY' AND (
        (status IN ('ACCEPTED','REJECTED') AND responded_at IS NOT NULL
            AND submitted_at IS NOT NULL AND responded_at >= submitted_at AND responded_at <= response_deadline)
        OR (status IN ('DRAFT','PENDING','EXPIRED') AND responded_at IS NULL)
        OR (status='CANCELLED' AND (responded_at IS NULL OR
            (submitted_at IS NOT NULL AND responded_at>=submitted_at AND responded_at<=response_deadline)))
    ))
    OR
    (service_type = 'ONE_OFF' AND status = 'CANCELLED' AND submitted_at IS NOT NULL)
);

EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_request_approval_flow
ON dbo.mentorship_requests AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id=i.id
   WHERE d.id IS NULL
     AND NOT (i.status IN (''DRAFT'',''PENDING'') OR (i.service_type=''ONE_OFF'' AND i.status=''ACCEPTED'')))
   THROW 51101, ''New monthly applications require review; one-off orders may start accepted.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE i.status <> d.status AND NOT (
     (d.status=''DRAFT'' AND i.status=''PENDING'') OR
     (d.status=''PENDING'' AND i.status IN (''ACCEPTED'',''REJECTED'',''EXPIRED'',''CANCELLED'')) OR
     (d.status=''ACCEPTED'' AND i.status=''CANCELLED'' AND d.funded_at IS NULL)))
   THROW 51102, ''Invalid application status transition.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE d.status <> ''DRAFT'' AND
   (i.mentee_id<>d.mentee_id OR i.mentor_id<>d.mentor_id OR i.service_id<>d.service_id
    OR i.submitted_at<>d.submitted_at OR ISNULL(i.response_deadline,''19000101'')<>ISNULL(d.response_deadline,''19000101'')
    OR i.offer_snapshot<>d.offer_snapshot))
   THROW 51103, ''Submitted application identity, terms and deadline are immutable.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE (d.funded_at IS NOT NULL AND (i.funded_at IS NULL OR i.funded_at<>d.funded_at))
      OR (d.responded_at IS NOT NULL AND i.status=d.status AND i.responded_at<>d.responded_at))
   THROW 51104, ''Recorded funding and review timestamps are immutable.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i WHERE i.status <> ''ACCEPTED''
   AND EXISTS (SELECT 1 FROM dbo.payments p WHERE p.request_id=i.id AND p.status IN (''PENDING'',''SUCCEEDED'')))
   THROW 51105, ''Close pending checkout before cancellation; paid requests retain ACCEPTED.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i WHERE i.funded_at IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM dbo.payments p JOIN dbo.escrow_ledger_entries e ON e.payment_id=p.id
   WHERE p.request_id=i.id AND p.status=''SUCCEEDED'' AND p.paid_at=i.funded_at
     AND e.entry_type=''HOLD'' AND e.reversal_of_id IS NULL AND e.amount=p.amount))
   THROW 51106, ''Funding timestamp requires successful payment and full escrow HOLD.'', 1;
END;');

COMMIT TRANSACTION;


-- =============================================
-- Migration: 029_20261016_backfill_one_off_workspace_conversations.sql
-- =============================================
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


-- =============================================
-- Migration: 030_20261019_add_mentee_disputes.sql
-- =============================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.bookings') AND name=N'CK_bookings_status')
    ALTER TABLE dbo.bookings DROP CONSTRAINT CK_bookings_status;
ALTER TABLE dbo.bookings WITH CHECK ADD CONSTRAINT CK_bookings_status CHECK (
    status IN ('PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED','NO_SHOW_REVIEW','NO_SHOW','DISPUTED')
);

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.subscriptions') AND name=N'CK_subscriptions_status')
    ALTER TABLE dbo.subscriptions DROP CONSTRAINT CK_subscriptions_status;
ALTER TABLE dbo.subscriptions WITH CHECK ADD CONSTRAINT CK_subscriptions_status CHECK (
    status IN ('TRIALING','ACTIVE','PAST_DUE','CANCELLED','ENDED','DISPUTED')
);

IF OBJECT_ID(N'dbo.disputes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.disputes (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_disputes PRIMARY KEY,
        ticket_code VARCHAR(40) NOT NULL CONSTRAINT UQ_disputes_ticket UNIQUE,
        complainant_id BIGINT NOT NULL,
        respondent_id BIGINT NOT NULL,
        booking_id BIGINT NULL,
        subscription_id BIGINT NULL,
        payment_id BIGINT NOT NULL,
        target_type VARCHAR(20) NOT NULL,
        previous_target_status VARCHAR(25) NOT NULL,
        category VARCHAR(40) NOT NULL,
        description NVARCHAR(2000) NOT NULL,
        disputed_amount DECIMAL(18,2) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'VND',
        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
        terms_accepted_at DATETIME2(3) NOT NULL,
        assigned_staff_id BIGINT NULL,
        response_deadline_at DATETIME2(3) NULL,
        resolution_type VARCHAR(30) NULL,
        resolution_note NVARCHAR(2000) NULL,
        refund_amount DECIMAL(18,2) NULL,
        resolved_at DATETIME2(3) NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_disputes_complainant FOREIGN KEY (complainant_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_disputes_respondent FOREIGN KEY (respondent_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_disputes_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id),
        CONSTRAINT FK_disputes_subscription FOREIGN KEY (subscription_id) REFERENCES dbo.subscriptions(id),
        CONSTRAINT FK_disputes_payment FOREIGN KEY (payment_id) REFERENCES dbo.payments(id),
        CONSTRAINT FK_disputes_staff FOREIGN KEY (assigned_staff_id) REFERENCES dbo.users(id),
        CONSTRAINT CK_disputes_target CHECK (
            (target_type = 'ONE_OFF' AND booking_id IS NOT NULL AND subscription_id IS NULL)
            OR (target_type = 'MONTHLY' AND booking_id IS NULL AND subscription_id IS NOT NULL)
        ),
        CONSTRAINT CK_disputes_parties CHECK (complainant_id <> respondent_id),
        CONSTRAINT CK_disputes_category CHECK (category IN ('NO_SHOW','QUALITY_MISMATCH','UNRESPONSIVE','CONDUCT_VIOLATION','TECHNICAL_FAILURE','OTHER')),
        CONSTRAINT CK_disputes_description CHECK (LEN(LTRIM(RTRIM(description))) BETWEEN 30 AND 2000),
        CONSTRAINT CK_disputes_amount CHECK (disputed_amount > 0),
        CONSTRAINT CK_disputes_status CHECK (status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','RESOLVED','REJECTED')),
        CONSTRAINT CK_disputes_refund CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= disputed_amount))
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'UX_disputes_active_booking')
    CREATE UNIQUE INDEX UX_disputes_active_booking ON dbo.disputes(booking_id)
    WHERE booking_id IS NOT NULL AND resolved_at IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'UX_disputes_active_subscription')
    CREATE UNIQUE INDEX UX_disputes_active_subscription ON dbo.disputes(subscription_id)
    WHERE subscription_id IS NOT NULL AND resolved_at IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'IX_disputes_complainant_created')
    CREATE INDEX IX_disputes_complainant_created ON dbo.disputes(complainant_id, created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'IX_disputes_payment_status')
    CREATE INDEX IX_disputes_payment_status ON dbo.disputes(payment_id, status);

IF OBJECT_ID(N'dbo.dispute_evidence', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dispute_evidence (
        id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dispute_evidence PRIMARY KEY,
        dispute_id BIGINT NOT NULL,
        file_id BIGINT NOT NULL CONSTRAINT UQ_dispute_evidence_file UNIQUE,
        uploaded_by BIGINT NOT NULL,
        display_order INT NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_dispute_evidence_dispute FOREIGN KEY (dispute_id) REFERENCES dbo.disputes(id),
        CONSTRAINT FK_dispute_evidence_file FOREIGN KEY (file_id) REFERENCES dbo.files(id),
        CONSTRAINT FK_dispute_evidence_uploader FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id),
        CONSTRAINT UQ_dispute_evidence_order UNIQUE (dispute_id, display_order),
        CONSTRAINT CK_dispute_evidence_order CHECK (display_order BETWEEN 1 AND 5)
    );
END;

COMMIT TRANSACTION;


-- =============================================
-- Migration: 031_20261023_add_operational_settings.sql
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.system_configs WITH (UPDLOCK,HOLDLOCK) WHERE config_key='platform.operations')
INSERT INTO dbo.system_configs(config_key,config_value,value_type,description)
VALUES ('platform.operations',N'{"value":{"maintenance":false,"announcement":"","otpResendSeconds":60,"otpExpiryMinutes":10,"withdrawalThreshold":10000,"withdrawalFee":0,"earningsHoldDays":7}}','JSON','Administrator operational controls');
IF COL_LENGTH('dbo.payments','earnings_hold_days') IS NULL
ALTER TABLE dbo.payments ADD earnings_hold_days INT NOT NULL CONSTRAINT DF_payments_hold_days DEFAULT 7 CONSTRAINT CK_payments_hold_days CHECK(earnings_hold_days BETWEEN 1 AND 90);
IF COL_LENGTH('dbo.mentor_payout_requests','fee_amount') IS NULL
ALTER TABLE dbo.mentor_payout_requests ADD fee_amount DECIMAL(18,0) NOT NULL CONSTRAINT DF_payout_fee DEFAULT 0, CONSTRAINT CK_payout_fee CHECK(fee_amount>=0 AND fee_amount<amount);
COMMIT TRANSACTION;


-- =============================================
-- Migration: 032_20261028_add_payout_approval_step.sql
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add approved_by and approved_at columns to mentor_payout_requests if they do not exist
IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD approved_by BIGINT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_mentor_payout_requests_approver')
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_approver
        FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD approved_at DATETIME2(3) NULL;
END;

-- Update status check constraint to allow APPROVED
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_status')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_status;

ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_status
    CHECK (status IN ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED'));

-- Update review check constraint using dynamic SQL so SQL Server's query compiler
-- does not throw Msg 207 ("Invalid column name") for newly added columns in the same batch.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_review')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_review;

EXEC(N'ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_review CHECK (
    (status = ''REQUESTED'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = ''APPROVED'' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
    OR (status = ''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)), '''') IS NOT NULL AND rejection_reason IS NULL)
    OR (status = ''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)), '''') IS NOT NULL AND transfer_reference IS NULL)
)');

-- Update lifecycle trigger to allow REQUESTED -> APPROVED -> PAID / REJECTED
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_mentor_payout_request_lifecycle
ON dbo.mentor_payout_requests AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
        THROW 51110, ''Payout request history cannot be deleted.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
        WHERE NOT (
            (d.status = ''REQUESTED'' AND i.status IN (''APPROVED'', ''REJECTED''))
            OR (d.status = ''APPROVED'' AND i.status IN (''PAID'', ''REJECTED''))
        )
        OR d.mentor_id <> i.mentor_id OR d.amount <> i.amount
        OR d.bank_name <> i.bank_name OR d.account_name <> i.account_name
        OR d.account_number_ciphertext <> i.account_number_ciphertext
        OR d.account_last4 <> i.account_last4 OR d.requested_at <> i.requested_at
    )
        THROW 51111, ''Payout requests allow valid transitions (REQUESTED->APPROVED->PAID, or REJECTED) and immutable request details.'', 1;
END');

COMMIT TRANSACTION;


-- =============================================
-- Migration: 033_20261029_add_dispute_refund_approval_step.sql
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add approved_by and approved_at columns to disputes
IF COL_LENGTH('dbo.disputes', 'approved_by') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD approved_by BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_approver
        FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.disputes', 'approved_at') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD approved_at DATETIME2(3) NULL;
END;

-- Add reviewed_by and transfer_reference columns for Admin payout execution
IF COL_LENGTH('dbo.disputes', 'reviewed_by') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD reviewed_by BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES dbo.users(id);
END;

IF COL_LENGTH('dbo.disputes', 'transfer_reference') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD transfer_reference VARCHAR(150) NULL;
END;

-- Add bank details columns for refund destination
IF COL_LENGTH('dbo.disputes', 'bank_name') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD bank_name VARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.disputes', 'account_number') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD account_number VARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.disputes', 'account_name') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD account_name NVARCHAR(150) NULL;
END;

-- Update status check constraint to allow APPROVED
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_disputes_status')
    ALTER TABLE dbo.disputes DROP CONSTRAINT CK_disputes_status;

ALTER TABLE dbo.disputes ADD CONSTRAINT CK_disputes_status
    CHECK (status IN ('SUBMITTED', 'IN_MEDIATION', 'AWAITING_EVIDENCE', 'APPROVED', 'RESOLVED', 'REJECTED'));

COMMIT TRANSACTION;



-- =============================================
-- Migration: 034_20261030_split_dispute_mediation_conversations.sql
-- =============================================
SET XACT_ABORT ON;

/* SQL Server compiles a whole batch before executing it.  Add the columns in
   their own batch so subsequent statements can safely reference them. */
IF COL_LENGTH('dbo.conversations', 'conversation_type') IS NULL
    ALTER TABLE dbo.conversations ADD conversation_type VARCHAR(20) NULL;
IF COL_LENGTH('dbo.conversations', 'dispute_id') IS NULL
    ALTER TABLE dbo.conversations ADD dispute_id BIGINT NULL;
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


-- =============================================
-- Migration: 035_20261030_backfill_open_dispute_mediation_rooms.sql
-- =============================================
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


-- =============================================
-- Migration: 036_20261030_move_legacy_mediation_notices.sql
-- =============================================
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


-- =============================================
-- Migration: 037_20261030_add_dispute_refund_receipt_file.sql
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add receipt_file_id column to disputes for admin transfer proof / receipt
IF COL_LENGTH('dbo.disputes', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_receipt_file
        FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

COMMIT TRANSACTION;


-- =============================================
-- Migration: 038_20261105_add_payout_transfer_receipt.sql
-- =============================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_receipt_file
        FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

COMMIT TRANSACTION;


-- =============================================
-- Migration: 039_20261105_add_payout_receipt_url.sql
-- =============================================
IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_url') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_url NVARCHAR(1000) NULL;
END;



-- =============================================
-- Migration: 040_20261105_add_mentor_dispute_response_tables.sql
-- =============================================
-- Migration 040: Dispute management tables and mentor response trail (SRS G3 V1.1 Â§10.8 UC71).
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
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.disputes', 'reason_code') IS NULL
        ALTER TABLE dbo.disputes ADD reason_code VARCHAR(50) NULL;
    IF COL_LENGTH('dbo.disputes', 'resolution') IS NULL
        ALTER TABLE dbo.disputes ADD resolution VARCHAR(20) NULL;
    IF COL_LENGTH('dbo.disputes', 'refund_id') IS NULL
        ALTER TABLE dbo.disputes ADD refund_id BIGINT NULL;
    IF COL_LENGTH('dbo.disputes', 'resolved_by') IS NULL
        ALTER TABLE dbo.disputes ADD resolved_by BIGINT NULL;
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
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.dispute_evidence', 'response_id') IS NULL
    BEGIN
        ALTER TABLE dbo.dispute_evidence ADD response_id BIGINT NULL;
        ALTER TABLE dbo.dispute_evidence ADD CONSTRAINT FK_dispute_evidence_response
            FOREIGN KEY(response_id) REFERENCES dbo.dispute_responses(id);
    END;
    IF COL_LENGTH('dbo.dispute_evidence', 'uploaded_side') IS NULL
        ALTER TABLE dbo.dispute_evidence ADD uploaded_side VARCHAR(10) NULL DEFAULT 'MENTEE';
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dispute_responses_dispute' AND object_id = OBJECT_ID('dbo.dispute_responses'))
    CREATE INDEX IX_dispute_responses_dispute ON dbo.dispute_responses(dispute_id, created_at, id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dispute_evidence_dispute' AND object_id = OBJECT_ID('dbo.dispute_evidence'))
    CREATE INDEX IX_dispute_evidence_dispute ON dbo.dispute_evidence(dispute_id, id);

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



-- =============================================
