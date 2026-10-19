SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

ALTER TABLE dbo.bookings DROP CONSTRAINT CK_bookings_status;
ALTER TABLE dbo.bookings WITH CHECK ADD CONSTRAINT CK_bookings_status CHECK (
    status IN ('PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED','NO_SHOW_REVIEW','NO_SHOW','DISPUTED')
);

ALTER TABLE dbo.subscriptions DROP CONSTRAINT CK_subscriptions_status;
ALTER TABLE dbo.subscriptions WITH CHECK ADD CONSTRAINT CK_subscriptions_status CHECK (
    status IN ('TRIALING','ACTIVE','PAST_DUE','CANCELLED','ENDED','DISPUTED')
);

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

CREATE UNIQUE INDEX UX_disputes_active_booking ON dbo.disputes(booking_id)
WHERE booking_id IS NOT NULL AND resolved_at IS NULL;
CREATE UNIQUE INDEX UX_disputes_active_subscription ON dbo.disputes(subscription_id)
WHERE subscription_id IS NOT NULL AND resolved_at IS NULL;
CREATE INDEX IX_disputes_complainant_created ON dbo.disputes(complainant_id, created_at DESC);
CREATE INDEX IX_disputes_payment_status ON dbo.disputes(payment_id, status);

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

COMMIT TRANSACTION;
