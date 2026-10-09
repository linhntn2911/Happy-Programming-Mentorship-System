/*
MONTHLY MENTORSHIP - APPROVAL FIRST (UTC; 31 tables unchanged)
1. Submit: status=PENDING, submitted_at=@now,
   response_deadline=DATEADD(HOUR,48,@now), funded_at=NULL. No payment row.
2. Review within deadline: PENDING -> ACCEPTED or REJECTED, responded_at=@now.
   No payment, escrow, subscription or workspace activation at acceptance.
3. Accepted only: create payments(request_id, billing_cycle_no=1, status=PENDING).
   Keep subscription_id NULL; initial billing dates may both be NULL.
   Read finance.commission_rate JSON value explicitly into commission_rate_snapshot;
   admin changes apply to NEW payments only. Never recalculate existing snapshots.
4. Trusted backend verifies VNPay signature, reference, amount, currency and result.
   In ONE transaction, lock request (UPDLOCK,HOLDLOCK), then payment, then ledger:
   a. Set payment SUCCEEDED + paid_at from verified gateway result.
   b. Insert full original escrow HOLD (unique idempotency key).
   c. Set request.funded_at=payment.paid_at; retain request ACCEPTED.
   d. Set initial payment billing dates [@activation, DATEADD(MONTH,1,@activation)].
   e. Insert subscription TRIALING, activated_at=current_period_start=@activation,
      trial_ends_at=DATEADD(DAY,7,@activation), current_period_end=the same end,
      next_billing_at=current_period_end; copy agreed price, currency and plan.
   f. Create/reuse conversation; authorize workspace by the paid subscription.
   Commit before sending email/unlocking UI. Duplicate callbacks return existing result;
   NEVER restart the trial. Roll back all steps if any step fails.
5. Payment failure/checkout expiry: only payment becomes FAILED/EXPIRED.
   Request remains ACCEPTED, no subscription; retry with a new attempt/reference.
6. Review timeout: only PENDING requests with response_deadline<=UTC now -> EXPIRED.
   REJECTED/EXPIRED/unpaid cancellation: no refund, because no money was collected.
   Cancel ACCEPTED unpaid request: lock request then close pending payment attempts
   in the same transaction before setting request CANCELLED; retain responded_at if already accepted.
   Late success after cancellation requires
   payment_events reconciliation/refund handling, never automatic activation.
7. Paid cancellation: retain request ACCEPTED and original payment SUCCEEDED;
   cancel subscription and use refunds + escrow REFUND_OUT. Trial refund is 100%.
8. After 7 days, trial worker moves eligible TRIALING subscription to ACTIVE.
   Renewal charges target subscription_id with billing_cycle_no>=2.
Backend must enforce authentication/ownership, offer price snapshot, response deadline
against current server time, refund/ledger balance and workspace access. SQL does not
verify gateway signatures or call VNPay. Grant application users minimum permissions.
This file has been statically reviewed; no SQL Server engine was available to execute it.
*/

/*
Happy Programming - 31 tables - approval-first revision - SQL Server 2019/2022+
Open this entire file in SSMS and Execute (F5).
FRESH DATABASE ONLY. Creates HappyProgramming if missing; refuses existing tables.
All timestamps are UTC. Backend must set updated_at on updates.
*/
USE [master];
GO
IF DB_ID(N'HappyProgramming') IS NULL
    EXEC(N'CREATE DATABASE [HappyProgramming] COLLATE Latin1_General_100_CI_AS_SC;');
GO
USE [HappyProgramming];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

IF DB_NAME() <> N'HappyProgramming'
    THROW 50000, 'Wrong database. Select HappyProgramming before executing.', 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)
    THROW 50001, 'Database already contains tables. No existing data was changed.', 1;

BEGIN TRY
BEGIN TRANSACTION;

-- Table 01 / 31
CREATE TABLE dbo.users (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
    email NVARCHAR(254) NOT NULL,
    role_code VARCHAR(20) NOT NULL DEFAULT 'MENTEE',
    email_normalized AS LOWER(LTRIM(RTRIM(email))) PERSISTED,
    password_hash VARCHAR(255) NULL,
    full_name NVARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    avatar_file_id BIGINT NULL,
    bio NVARCHAR(1000) NULL,
    experience_level VARCHAR(20) NULL,
    github_url NVARCHAR(500) NULL,
    linkedin_url NVARCHAR(500) NULL,
    portfolio_url NVARCHAR(500) NULL,
    country_code CHAR(2) NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    email_verified_at DATETIME2(3) NULL,
    last_login_at DATETIME2(3) NULL,
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_users_role CHECK (role_code IN ('ADMIN','STAFF','MENTOR','MENTEE')),
    CONSTRAINT CK_users_email CHECK (LEN(LTRIM(RTRIM(email))) > 3),
    CONSTRAINT CK_users_name CHECK (LEN(LTRIM(RTRIM(full_name))) > 0),
    CONSTRAINT CK_users_status CHECK (status IN ('ACTIVE','INACTIVE','LOCKED')),
    CONSTRAINT CK_users_level CHECK (experience_level IN ('BEGINNER','JUNIOR','MID','SENIOR')),
    CONSTRAINT CK_users_failed CHECK (failed_login_count >= 0)
);
CREATE UNIQUE INDEX UX_users_email ON dbo.users(email_normalized);

-- Table 02 / 31
CREATE TABLE dbo.user_permissions (
    user_id BIGINT NOT NULL,
    permission_code VARCHAR(80) NOT NULL,
    assigned_by BIGINT NOT NULL,
    assigned_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_permissions PRIMARY KEY(user_id, permission_code),
    CONSTRAINT FK_user_permissions_user FOREIGN KEY(user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_user_permissions_assigner FOREIGN KEY(assigned_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_user_permissions_code CHECK (permission_code IN ('MENTOR_APPLICATION_MANAGE','MENTEE_MANAGE','MENTORSHIP_REQUEST_MANAGE','SKILL_MANAGE'))
);

-- Table 03 / 31
CREATE TABLE dbo.auth_identities (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_auth_identities PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_subject VARCHAR(255) COLLATE Latin1_General_100_BIN2 NOT NULL,
    provider_email NVARCHAR(254) NULL,
    last_used_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_auth_identity UNIQUE(provider, provider_subject),
    CONSTRAINT FK_auth_identity_user FOREIGN KEY(user_id) REFERENCES dbo.users(id)
);

-- Table 04 / 31
CREATE TABLE dbo.security_tokens (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_security_tokens PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash BINARY(32) NOT NULL CONSTRAINT UQ_security_token_hash UNIQUE,
    purpose VARCHAR(30) NOT NULL,
    expires_at DATETIME2(3) NOT NULL,
    used_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_security_tokens_user FOREIGN KEY(user_id) REFERENCES dbo.users(id),
    CONSTRAINT CK_security_tokens_purpose CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
    CONSTRAINT CK_security_tokens_expiry CHECK (expires_at > created_at)
);

-- Table 05 / 31
CREATE TABLE dbo.mentor_profiles (
    user_id BIGINT NOT NULL CONSTRAINT PK_mentor_profiles PRIMARY KEY,
    slug VARCHAR(200) NOT NULL CONSTRAINT UQ_mentor_profiles_slug UNIQUE,
    headline NVARCHAR(250) NOT NULL,
    job_title NVARCHAR(150) NOT NULL,
    company_name NVARCHAR(200) NULL,
    biography NVARCHAR(1000) NOT NULL,
    years_experience DECIMAL(4,1) NOT NULL,
    experience_summary NVARCHAR(MAX) NULL,
    language_codes NVARCHAR(500) NOT NULL DEFAULT N'[]',
    is_public BIT NOT NULL DEFAULT 0,
    accepting_mentees BIT NOT NULL DEFAULT 0,
    max_active_mentees INT NOT NULL DEFAULT 5,
    approved_by BIGINT NULL,
    approved_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_mentor_profiles_user FOREIGN KEY(user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_mentor_profiles_approver FOREIGN KEY(approved_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_mentor_profiles_bio CHECK (LEN(LTRIM(RTRIM(biography))) BETWEEN 50 AND 1000),
    CONSTRAINT CK_mentor_profiles_experience CHECK (years_experience BETWEEN 0 AND 80),
    CONSTRAINT CK_mentor_profiles_capacity CHECK (max_active_mentees > 0),
    CONSTRAINT CK_mentor_profiles_languages CHECK (ISJSON(language_codes) = 1 AND LEFT(LTRIM(language_codes),1) = N'['),
    CONSTRAINT CK_mentor_profiles_public CHECK (is_public = 0 OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

-- Table 06 / 31
CREATE TABLE dbo.files (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_files PRIMARY KEY,
    uploaded_by BIGINT NOT NULL,
    original_name NVARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT UQ_files_storage_key UNIQUE,
    mime_type VARCHAR(150) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(64) NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_files_uploader FOREIGN KEY(uploaded_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_files_size CHECK (size_bytes > 0),
    CONSTRAINT CK_files_visibility CHECK (visibility IN ('PRIVATE','AUTHORIZED','PUBLIC')),
    CONSTRAINT CK_files_status CHECK (status IN ('UPLOADING','READY','QUARANTINED','DELETED'))
);
ALTER TABLE dbo.users ADD CONSTRAINT FK_users_avatar FOREIGN KEY(avatar_file_id) REFERENCES dbo.files(id);

-- Table 07 / 31
CREATE TABLE dbo.mentor_applications (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_mentor_applications PRIMARY KEY,
    applicant_id BIGINT NOT NULL,
    biography NVARCHAR(1000) NOT NULL,
    years_experience DECIMAL(4,1) NOT NULL,
    professional_background NVARCHAR(MAX) NOT NULL,
    profile_snapshot NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at DATETIME2(3) NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME2(3) NULL,
    review_note NVARCHAR(1000) NULL,
    rejection_reason NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_mentor_applications_applicant FOREIGN KEY(applicant_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_mentor_applications_reviewer FOREIGN KEY(reviewed_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_mentor_applications_status CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','WITHDRAWN')),
    CONSTRAINT CK_mentor_applications_experience CHECK (years_experience BETWEEN 0 AND 80),
    CONSTRAINT CK_mentor_applications_snapshot CHECK (ISJSON(profile_snapshot) = 1),
    CONSTRAINT CK_mentor_applications_submission CHECK (status = 'DRAFT' OR submitted_at IS NOT NULL),
    CONSTRAINT CK_mentor_applications_review CHECK (status NOT IN ('APPROVED','REJECTED') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX UX_mentor_applications_pending ON dbo.mentor_applications(applicant_id) WHERE status = 'PENDING';

-- Table 08 / 31
CREATE TABLE dbo.skill_categories (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_skill_categories PRIMARY KEY,
    name NVARCHAR(100) NOT NULL CONSTRAINT UQ_skill_categories_name UNIQUE,
    slug VARCHAR(150) NOT NULL CONSTRAINT UQ_skill_categories_slug UNIQUE,
    description NVARCHAR(500) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Table 09 / 31
CREATE TABLE dbo.skills (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_skills PRIMARY KEY,
    category_id BIGINT NOT NULL,
    name NVARCHAR(100) NOT NULL CONSTRAINT UQ_skills_name UNIQUE,
    slug VARCHAR(150) NOT NULL CONSTRAINT UQ_skills_slug UNIQUE,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_skills_category FOREIGN KEY(category_id) REFERENCES dbo.skill_categories(id),
    CONSTRAINT FK_skills_creator FOREIGN KEY(created_by) REFERENCES dbo.users(id)
);

-- Table 10 / 31
CREATE TABLE dbo.mentor_application_skills (
    application_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    years_experience DECIMAL(4,1) NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    verified_by BIGINT NULL,
    verified_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mentor_application_skills PRIMARY KEY(application_id, skill_id),
    CONSTRAINT FK_application_skills_application FOREIGN KEY(application_id) REFERENCES dbo.mentor_applications(id),
    CONSTRAINT FK_application_skills_skill FOREIGN KEY(skill_id) REFERENCES dbo.skills(id),
    CONSTRAINT FK_application_skills_verifier FOREIGN KEY(verified_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_application_skills_experience CHECK (years_experience BETWEEN 0 AND 80),
    CONSTRAINT CK_application_skills_status CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED'))
);

-- Table 11 / 31
CREATE TABLE dbo.mentor_skills (
    mentor_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    years_experience DECIMAL(4,1) NULL,
    is_verified BIT NOT NULL DEFAULT 0,
    verified_by BIGINT NULL,
    verified_at DATETIME2(3) NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mentor_skills PRIMARY KEY(mentor_id, skill_id),
    CONSTRAINT FK_mentor_skills_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT FK_mentor_skills_skill FOREIGN KEY(skill_id) REFERENCES dbo.skills(id),
    CONSTRAINT FK_mentor_skills_verifier FOREIGN KEY(verified_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_mentor_skills_experience CHECK (years_experience BETWEEN 0 AND 80),
    CONSTRAINT CK_mentor_skills_verified CHECK (is_verified = 0 OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

-- Table 12 / 31
CREATE TABLE dbo.service_offerings (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_service_offerings PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    session_duration_minutes SMALLINT NOT NULL,
    calls_per_period SMALLINT NULL,
    chat_included BIT NOT NULL DEFAULT 1,
    response_time_hours SMALLINT NULL,
    trial_days SMALLINT NOT NULL DEFAULT 0,
    benefits NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_service_offerings_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT UQ_service_offerings_owner_type UNIQUE(id, mentor_id, service_type),
    CONSTRAINT CK_service_offerings_type CHECK (service_type IN ('MONTHLY','ONE_OFF')),
    CONSTRAINT CK_service_offerings_price CHECK (price >= 0),
    CONSTRAINT CK_service_offerings_duration CHECK (session_duration_minutes BETWEEN 1 AND 1440),
    CONSTRAINT CK_service_offerings_calls CHECK ((service_type = 'MONTHLY' AND calls_per_period IS NOT NULL AND calls_per_period >= 0) OR (service_type = 'ONE_OFF' AND calls_per_period IS NULL)),
    CONSTRAINT CK_service_offerings_response CHECK (response_time_hours > 0),
    CONSTRAINT CK_service_offerings_trial CHECK (trial_days BETWEEN 0 AND 30 AND (service_type = 'MONTHLY' OR trial_days = 0)),
    CONSTRAINT CK_service_offerings_benefits CHECK (ISJSON(benefits) = 1 AND LEFT(LTRIM(benefits),1) = N'['),
    CONSTRAINT CK_service_offerings_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE'))
);

-- Table 13 / 31
CREATE TABLE dbo.wishlists (
    mentee_id BIGINT NOT NULL,
    mentor_id BIGINT NOT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_wishlists PRIMARY KEY(mentee_id, mentor_id),
    CONSTRAINT FK_wishlists_mentee FOREIGN KEY(mentee_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_wishlists_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT CK_wishlists_self CHECK (mentee_id <> mentor_id)
);

-- Table 14 / 31
CREATE TABLE dbo.mentorship_requests (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_mentorship_requests PRIMARY KEY,
    mentee_id BIGINT NOT NULL,
    mentor_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    service_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    experience_level VARCHAR(20) NOT NULL,
    background NVARCHAR(2000) NULL,
    learning_goals NVARCHAR(4000) NOT NULL,
    expectations NVARCHAR(2000) NULL,
    project_links NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
    offer_snapshot NVARCHAR(MAX) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at DATETIME2(3) NULL,
    funded_at DATETIME2(3) NULL,
    response_deadline DATETIME2(3) NULL,
    responded_at DATETIME2(3) NULL,
    rejection_reason NVARCHAR(1000) NULL,
    cancelled_at DATETIME2(3) NULL,
    cancellation_reason NVARCHAR(1000) NULL,
    terms_version VARCHAR(50) NOT NULL,
    terms_accepted_at DATETIME2(3) NOT NULL,
    version ROWVERSION,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_requests_mentee FOREIGN KEY(mentee_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_requests_offering FOREIGN KEY(service_id, mentor_id, service_type) REFERENCES dbo.service_offerings(id, mentor_id, service_type),
    CONSTRAINT UQ_requests_context UNIQUE(id, service_id, mentor_id, mentee_id),
    CONSTRAINT CK_requests_self CHECK (mentee_id <> mentor_id),
    CONSTRAINT CK_requests_type CHECK (service_type = 'MONTHLY'),
    CONSTRAINT CK_requests_level CHECK (experience_level IN ('BEGINNER','JUNIOR','MID','SENIOR')),
    CONSTRAINT CK_requests_goals CHECK (LEN(LTRIM(RTRIM(learning_goals))) >= 50),
    CONSTRAINT CK_requests_links CHECK (ISJSON(project_links) = 1 AND LEFT(LTRIM(project_links),1) = N'['),
    CONSTRAINT CK_requests_snapshot CHECK (ISJSON(offer_snapshot) = 1 AND LEFT(LTRIM(offer_snapshot),1) = N'{'),
    CONSTRAINT CK_requests_status CHECK (status IN ('DRAFT','PENDING_PAYMENT','PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),
    CONSTRAINT CK_requests_submitted CHECK (status = 'DRAFT' OR submitted_at IS NOT NULL),
    CONSTRAINT CK_requests_funded CHECK (funded_at IS NULL OR (submitted_at IS NOT NULL AND funded_at >= submitted_at)),
    CONSTRAINT CK_requests_deadline CHECK ((funded_at IS NULL AND response_deadline IS NULL) OR (funded_at IS NOT NULL AND response_deadline IS NOT NULL AND response_deadline > funded_at)),
    CONSTRAINT CK_requests_review_ready CHECK (status NOT IN ('PENDING','ACCEPTED','REJECTED') OR funded_at IS NOT NULL),
    CONSTRAINT CK_requests_response CHECK (status NOT IN ('ACCEPTED','REJECTED') OR responded_at IS NOT NULL)
);
CREATE UNIQUE INDEX UX_requests_pending_pair ON dbo.mentorship_requests(mentee_id, mentor_id) WHERE status = 'PENDING';

-- Table 15 / 31
CREATE TABLE dbo.mentorship_request_skills (
    request_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mentorship_request_skills PRIMARY KEY(request_id, skill_id),
    CONSTRAINT FK_request_skills_request FOREIGN KEY(request_id) REFERENCES dbo.mentorship_requests(id),
    CONSTRAINT FK_request_skills_skill FOREIGN KEY(skill_id) REFERENCES dbo.skills(id)
);

-- Table 16 / 31
CREATE TABLE dbo.availability_rules (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_availability_rules PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    weekday TINYINT NOT NULL,
    start_local_time TIME(0) NOT NULL,
    end_local_time TIME(0) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_availability_rules_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT CK_availability_rules_day CHECK (weekday BETWEEN 1 AND 7),
    CONSTRAINT CK_availability_rules_time CHECK (end_local_time > start_local_time),
    CONSTRAINT CK_availability_rules_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Table 17 / 31
CREATE TABLE dbo.availability_exceptions (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_availability_exceptions PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    start_at DATETIME2(3) NOT NULL,
    end_at DATETIME2(3) NOT NULL,
    exception_type VARCHAR(30) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    external_event_id VARCHAR(255) NULL,
    reason NVARCHAR(500) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_availability_exceptions_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT CK_availability_exceptions_time CHECK (end_at > start_at),
    CONSTRAINT CK_availability_exceptions_type CHECK (exception_type IN ('BLOCKED','EXTRA_AVAILABLE')),
    CONSTRAINT CK_availability_exceptions_source CHECK (source IN ('MANUAL','GOOGLE'))
);

-- Table 18 / 31
CREATE TABLE dbo.slot_holds (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_slot_holds PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    mentee_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    start_at DATETIME2(3) NOT NULL,
    end_at DATETIME2(3) NOT NULL,
    expires_at DATETIME2(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'HELD',
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_slot_holds_mentee FOREIGN KEY(mentee_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_slot_holds_offering FOREIGN KEY(service_id, mentor_id, service_type) REFERENCES dbo.service_offerings(id, mentor_id, service_type),
    CONSTRAINT UQ_slot_holds_context UNIQUE(id, service_id, mentor_id, mentee_id),
    CONSTRAINT CK_slot_holds_self CHECK (mentor_id <> mentee_id),
    CONSTRAINT CK_slot_holds_times CHECK (end_at > start_at AND expires_at > created_at AND expires_at <= start_at),
    CONSTRAINT CK_slot_holds_status CHECK (status IN ('HELD','CONVERTED','RELEASED','EXPIRED'))
);

-- Table 19 / 31
CREATE TABLE dbo.subscriptions (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_subscriptions PRIMARY KEY,
    request_id BIGINT NOT NULL CONSTRAINT UQ_subscriptions_request UNIQUE,
    service_id BIGINT NOT NULL,
    mentor_id BIGINT NOT NULL,
    mentee_id BIGINT NOT NULL,
    agreed_price DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    plan_snapshot NVARCHAR(MAX) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'ACTIVE',
    activated_at DATETIME2(3) NULL,
    trial_ends_at DATETIME2(3) NULL,
    current_period_start DATETIME2(3) NULL,
    current_period_end DATETIME2(3) NULL,
    next_billing_at DATETIME2(3) NULL,
    renewal_mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    cancel_at_period_end BIT NOT NULL DEFAULT 0,
    cancelled_at DATETIME2(3) NULL,
    cancellation_reason NVARCHAR(1000) NULL,
    ended_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_subscriptions_request FOREIGN KEY(request_id, service_id, mentor_id, mentee_id) REFERENCES dbo.mentorship_requests(id, service_id, mentor_id, mentee_id),
    CONSTRAINT UQ_subscriptions_context UNIQUE(id, service_id, mentor_id, mentee_id),
    CONSTRAINT CK_subscriptions_price CHECK (agreed_price >= 0),
    CONSTRAINT CK_subscriptions_snapshot CHECK (ISJSON(plan_snapshot) = 1 AND LEFT(LTRIM(plan_snapshot),1) = N'{'),
    CONSTRAINT CK_subscriptions_status CHECK (status IN ('TRIALING','ACTIVE','PAST_DUE','CANCELLED','ENDED')),
    CONSTRAINT CK_subscriptions_renewal CHECK (renewal_mode IN ('MANUAL','AUTOMATIC')),
    CONSTRAINT CK_subscriptions_period CHECK ((current_period_start IS NULL AND current_period_end IS NULL) OR (current_period_start IS NOT NULL AND current_period_end IS NOT NULL AND current_period_end > current_period_start)),
    CONSTRAINT CK_subscriptions_trial CHECK (trial_ends_at IS NULL OR (activated_at IS NOT NULL AND trial_ends_at >= activated_at)),
    CONSTRAINT CK_subscriptions_activation CHECK (status NOT IN ('TRIALING','ACTIVE','PAST_DUE') OR (activated_at IS NOT NULL AND current_period_start IS NOT NULL AND current_period_end IS NOT NULL)),
    CONSTRAINT CK_subscriptions_trial_required CHECK (status <> 'TRIALING' OR trial_ends_at IS NOT NULL)
);

-- Table 20 / 31
CREATE TABLE dbo.bookings (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bookings PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL CONSTRAINT UQ_bookings_code UNIQUE,
    service_id BIGINT NOT NULL,
    mentor_id BIGINT NOT NULL,
    mentee_id BIGINT NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    subscription_id BIGINT NULL,
    slot_hold_id BIGINT NULL,
    booking_type VARCHAR(20) NOT NULL,
    agenda NVARCHAR(4000) NULL,
    start_at DATETIME2(3) NOT NULL,
    end_at DATETIME2(3) NOT NULL,
    price_snapshot DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    terms_snapshot NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING_PAYMENT',
    meeting_url NVARCHAR(1000) NULL,
    meeting_code VARCHAR(100) NULL,
    external_event_id VARCHAR(255) NULL,
    meeting_sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    mentor_join_clicked_at DATETIME2(3) NULL,
    mentee_join_clicked_at DATETIME2(3) NULL,
    completed_at DATETIME2(3) NULL,
    completed_by BIGINT NULL,
    cancelled_at DATETIME2(3) NULL,
    cancelled_by BIGINT NULL,
    cancellation_reason NVARCHAR(1000) NULL,
    version ROWVERSION,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_bookings_mentee FOREIGN KEY(mentee_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_bookings_offering FOREIGN KEY(service_id, mentor_id, service_type) REFERENCES dbo.service_offerings(id, mentor_id, service_type),
    CONSTRAINT FK_bookings_subscription FOREIGN KEY(subscription_id, service_id, mentor_id, mentee_id) REFERENCES dbo.subscriptions(id, service_id, mentor_id, mentee_id),
    CONSTRAINT FK_bookings_hold FOREIGN KEY(slot_hold_id, service_id, mentor_id, mentee_id) REFERENCES dbo.slot_holds(id, service_id, mentor_id, mentee_id),
    CONSTRAINT FK_bookings_completer FOREIGN KEY(completed_by) REFERENCES dbo.users(id),
    CONSTRAINT FK_bookings_canceller FOREIGN KEY(cancelled_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_bookings_self CHECK (mentee_id <> mentor_id),
    CONSTRAINT CK_bookings_time CHECK (end_at > start_at),
    CONSTRAINT CK_bookings_price CHECK (price_snapshot >= 0),
    CONSTRAINT CK_bookings_type CHECK ((booking_type = 'ONE_OFF' AND service_type = 'ONE_OFF' AND subscription_id IS NULL) OR (booking_type = 'MONTHLY_CALL' AND service_type = 'MONTHLY' AND subscription_id IS NOT NULL AND price_snapshot = 0)),
    CONSTRAINT CK_bookings_terms CHECK (ISJSON(terms_snapshot) = 1),
    CONSTRAINT CK_bookings_status CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED','NO_SHOW_REVIEW','NO_SHOW')),
    CONSTRAINT CK_bookings_meeting_sync CHECK (meeting_sync_status IN ('PENDING','SYNCED','FAILED')),
    CONSTRAINT CK_bookings_completed CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);
CREATE UNIQUE INDEX UX_bookings_slot_hold ON dbo.bookings(slot_hold_id) WHERE slot_hold_id IS NOT NULL;

-- Table 21 / 31
CREATE TABLE dbo.action_items (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_action_items PRIMARY KEY,
    subscription_id BIGINT NOT NULL,
    title NVARCHAR(250) NOT NULL,
    description NVARCHAR(MAX) NULL,
    assigned_by BIGINT NOT NULL,
    assigned_to BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    due_at DATETIME2(3) NULL,
    completed_at DATETIME2(3) NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_action_items_subscription FOREIGN KEY(subscription_id) REFERENCES dbo.subscriptions(id),
    CONSTRAINT FK_action_items_assigner FOREIGN KEY(assigned_by) REFERENCES dbo.users(id),
    CONSTRAINT FK_action_items_assignee FOREIGN KEY(assigned_to) REFERENCES dbo.users(id),
    CONSTRAINT CK_action_items_status CHECK (status IN ('TODO','IN_PROGRESS','DONE')),
    CONSTRAINT CK_action_items_completed CHECK (status <> 'DONE' OR completed_at IS NOT NULL)
);

-- Table 22 / 31
CREATE TABLE dbo.payments (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_payments PRIMARY KEY,
    booking_id BIGINT NULL,
    request_id BIGINT NULL,
    subscription_id BIGINT NULL,
    billing_cycle_no INT NULL,
    billing_period_start DATETIME2(3) NULL,
    billing_period_end DATETIME2(3) NULL,
    attempt_no INT NOT NULL DEFAULT 1,
    gateway VARCHAR(30) NOT NULL DEFAULT 'VNPAY',
    merchant_reference VARCHAR(100) NOT NULL CONSTRAINT UQ_payments_merchant_reference UNIQUE,
    gateway_transaction_id VARCHAR(100) NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    commission_rate_snapshot DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at DATETIME2(3) NOT NULL,
    paid_at DATETIME2(3) NULL,
    failure_code VARCHAR(50) NULL,
    failure_message NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_payments_request FOREIGN KEY(request_id) REFERENCES dbo.mentorship_requests(id),
    CONSTRAINT FK_payments_booking FOREIGN KEY(booking_id) REFERENCES dbo.bookings(id),
    CONSTRAINT FK_payments_subscription FOREIGN KEY(subscription_id) REFERENCES dbo.subscriptions(id),
    CONSTRAINT CK_payments_target CHECK (
        (booking_id IS NOT NULL AND request_id IS NULL AND subscription_id IS NULL
         AND billing_cycle_no IS NULL AND billing_period_start IS NULL AND billing_period_end IS NULL)
        OR (booking_id IS NULL AND request_id IS NOT NULL AND subscription_id IS NULL
            AND billing_cycle_no IS NOT NULL AND billing_cycle_no = 1)
        OR (booking_id IS NULL AND request_id IS NULL AND subscription_id IS NOT NULL
            AND billing_cycle_no IS NOT NULL AND billing_cycle_no >= 2)
    ),
    CONSTRAINT CK_payments_period CHECK (
        (billing_period_start IS NULL AND billing_period_end IS NULL)
        OR (billing_period_start IS NOT NULL AND billing_period_end IS NOT NULL AND billing_period_end > billing_period_start)
    ),
    CONSTRAINT CK_payments_initial_period CHECK (request_id IS NULL OR billing_period_start IS NULL OR status = 'SUCCEEDED'),
    CONSTRAINT CK_payments_renewal_period CHECK (subscription_id IS NULL OR status <> 'SUCCEEDED' OR (billing_period_start IS NOT NULL AND billing_period_end IS NOT NULL)),
    CONSTRAINT CK_payments_amount CHECK (amount > 0),
    CONSTRAINT CK_payments_attempt CHECK (attempt_no > 0),
    CONSTRAINT CK_payments_commission CHECK (commission_rate_snapshot BETWEEN 0 AND 100),
    CONSTRAINT CK_payments_status CHECK (status IN ('PENDING','SUCCEEDED','FAILED','CANCELLED','EXPIRED')),
    CONSTRAINT CK_payments_success CHECK (status <> 'SUCCEEDED' OR paid_at IS NOT NULL),
    CONSTRAINT CK_payments_expiry CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX UX_payments_request_attempt ON dbo.payments(request_id, attempt_no) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payments_request_success ON dbo.payments(request_id) WHERE request_id IS NOT NULL AND status = 'SUCCEEDED';
CREATE UNIQUE INDEX UX_payments_gateway_transaction ON dbo.payments(gateway, gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payments_booking_attempt ON dbo.payments(booking_id, attempt_no) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payments_subscription_attempt ON dbo.payments(subscription_id, billing_cycle_no, attempt_no) WHERE subscription_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payments_booking_success ON dbo.payments(booking_id) WHERE status = 'SUCCEEDED' AND booking_id IS NOT NULL;
CREATE UNIQUE INDEX UX_payments_period_success ON dbo.payments(subscription_id, billing_cycle_no) WHERE status = 'SUCCEEDED' AND subscription_id IS NOT NULL;

-- Table 23 / 31
CREATE TABLE dbo.payment_events (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_payment_events PRIMARY KEY,
    payment_id BIGINT NULL,
    provider VARCHAR(30) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    event_key VARCHAR(200) NOT NULL,
    payload NVARCHAR(MAX) NOT NULL,
    signature_valid BIT NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    received_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    processed_at DATETIME2(3) NULL,
    error_message NVARCHAR(1000) NULL,
    CONSTRAINT UQ_payment_events_dedup UNIQUE(provider, event_type, event_key),
    CONSTRAINT FK_payment_events_payment FOREIGN KEY(payment_id) REFERENCES dbo.payments(id),
    CONSTRAINT CK_payment_events_payload CHECK (ISJSON(payload) = 1),
    CONSTRAINT CK_payment_events_status CHECK (processing_status IN ('RECEIVED','PROCESSED','REJECTED','ERROR'))
);

-- Table 24 / 31
CREATE TABLE dbo.refunds (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_refunds PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    refund_reference VARCHAR(100) NOT NULL CONSTRAINT UQ_refunds_reference UNIQUE,
    amount DECIMAL(18,2) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_text NVARCHAR(1000) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by BIGINT NULL,
    gateway_refund_id VARCHAR(100) NULL,
    requested_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    completed_at DATETIME2(3) NULL,
    failure_message NVARCHAR(1000) NULL,
    CONSTRAINT FK_refunds_payment FOREIGN KEY(payment_id) REFERENCES dbo.payments(id),
    CONSTRAINT FK_refunds_requester FOREIGN KEY(requested_by) REFERENCES dbo.users(id),
    CONSTRAINT UQ_refunds_context UNIQUE(id, payment_id),
    CONSTRAINT CK_refunds_amount CHECK (amount > 0),
    CONSTRAINT CK_refunds_status CHECK (status IN ('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED')),
    CONSTRAINT CK_refunds_completed CHECK (status <> 'SUCCEEDED' OR completed_at IS NOT NULL)
);

-- Table 25 / 31
CREATE TABLE dbo.escrow_ledger_entries (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_escrow_ledger_entries PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    refund_id BIGINT NULL,
    entry_type VARCHAR(30) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL CONSTRAINT UQ_escrow_idempotency UNIQUE,
    reversal_of_id BIGINT NULL,
    reason NVARCHAR(1000) NULL,
    created_by BIGINT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_escrow_payment FOREIGN KEY(payment_id) REFERENCES dbo.payments(id),
    CONSTRAINT FK_escrow_refund FOREIGN KEY(refund_id, payment_id) REFERENCES dbo.refunds(id, payment_id),
    CONSTRAINT UQ_escrow_context UNIQUE(id, payment_id, entry_type, amount),
    CONSTRAINT FK_escrow_reversal FOREIGN KEY(reversal_of_id, payment_id, entry_type, amount) REFERENCES dbo.escrow_ledger_entries(id, payment_id, entry_type, amount),
    CONSTRAINT FK_escrow_creator FOREIGN KEY(created_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_escrow_type CHECK (entry_type IN ('HOLD','REFUND_OUT','MENTOR_RELEASE','PLATFORM_FEE')),
    CONSTRAINT CK_escrow_amount CHECK (amount > 0),
    CONSTRAINT CK_escrow_refund_required CHECK ((entry_type = 'REFUND_OUT' AND refund_id IS NOT NULL) OR (entry_type <> 'REFUND_OUT' AND refund_id IS NULL)),
    CONSTRAINT CK_escrow_reversal_order CHECK (reversal_of_id IS NULL OR reversal_of_id < id)
);
CREATE UNIQUE INDEX UX_escrow_reversal ON dbo.escrow_ledger_entries(reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE UNIQUE INDEX UX_escrow_original_hold ON dbo.escrow_ledger_entries(payment_id) WHERE entry_type = 'HOLD' AND reversal_of_id IS NULL;

-- Table 26 / 31
CREATE TABLE dbo.conversations (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_conversations PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    mentee_id BIGINT NOT NULL,
    inquiry_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    mentor_last_read_message_id BIGINT NULL,
    mentee_last_read_message_id BIGINT NULL,
    last_message_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_conversations_pair UNIQUE(mentor_id, mentee_id),
    CONSTRAINT FK_conversations_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT FK_conversations_mentee FOREIGN KEY(mentee_id) REFERENCES dbo.users(id),
    CONSTRAINT CK_conversations_self CHECK (mentor_id <> mentee_id),
    CONSTRAINT CK_conversations_inquiry CHECK (inquiry_status IN ('PENDING','APPROVED','REJECTED','CLOSED'))
);

-- Table 27 / 31
CREATE TABLE dbo.messages (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_messages PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    client_message_key VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    body NVARCHAR(MAX) NULL,
    code_language VARCHAR(50) NULL,
    reply_to_message_id BIGINT NULL,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'ALLOWED',
    sent_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    delivered_at DATETIME2(3) NULL,
    edited_at DATETIME2(3) NULL,
    CONSTRAINT UQ_messages_client UNIQUE(sender_id, client_message_key),
    CONSTRAINT UQ_messages_conversation UNIQUE(id, conversation_id),
    CONSTRAINT FK_messages_conversation FOREIGN KEY(conversation_id) REFERENCES dbo.conversations(id),
    CONSTRAINT FK_messages_sender FOREIGN KEY(sender_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_messages_reply FOREIGN KEY(reply_to_message_id, conversation_id) REFERENCES dbo.messages(id, conversation_id),
    CONSTRAINT CK_messages_type CHECK (message_type IN ('TEXT','CODE','FILE','SYSTEM')),
    CONSTRAINT CK_messages_moderation CHECK (moderation_status IN ('ALLOWED','BLOCKED','FLAGGED')),
    CONSTRAINT CK_messages_body CHECK (message_type = 'FILE' OR (body IS NOT NULL AND LEN(LTRIM(RTRIM(body))) > 0)),
    CONSTRAINT CK_messages_reply_order CHECK (reply_to_message_id IS NULL OR reply_to_message_id < id)
);
ALTER TABLE dbo.conversations ADD
    CONSTRAINT FK_conversations_mentor_read FOREIGN KEY(mentor_last_read_message_id, id) REFERENCES dbo.messages(id, conversation_id);
ALTER TABLE dbo.conversations ADD
    CONSTRAINT FK_conversations_mentee_read FOREIGN KEY(mentee_last_read_message_id, id) REFERENCES dbo.messages(id, conversation_id);

-- Table 28 / 31 (Đã fix: hỗ trợ cả One-off booking lẫn Monthly subscription)
CREATE TABLE dbo.reviews (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_reviews PRIMARY KEY,
    booking_id BIGINT NULL,
    subscription_id BIGINT NULL,
    rating TINYINT NOT NULL,
    comment NVARCHAR(500) NOT NULL,
    visibility_status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    editable_until DATETIME2(3) NOT NULL DEFAULT DATEADD(DAY,7,SYSUTCDATETIME()),
    reported_by BIGINT NULL,
    report_reason NVARCHAR(1000) NULL,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
    moderated_by BIGINT NULL,
    moderated_at DATETIME2(3) NULL,
    moderation_note NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_reviews_booking FOREIGN KEY(booking_id) REFERENCES dbo.bookings(id),
    CONSTRAINT FK_reviews_subscription FOREIGN KEY(subscription_id) REFERENCES dbo.subscriptions(id),
    CONSTRAINT FK_reviews_reporter FOREIGN KEY(reported_by) REFERENCES dbo.users(id),
    CONSTRAINT FK_reviews_moderator FOREIGN KEY(moderated_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_reviews_target CHECK (
        (booking_id IS NOT NULL AND subscription_id IS NULL)
        OR (booking_id IS NULL AND subscription_id IS NOT NULL)
    ),
    CONSTRAINT CK_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT CK_reviews_comment CHECK (LEN(LTRIM(RTRIM(comment))) BETWEEN 10 AND 500),
    CONSTRAINT CK_reviews_visibility CHECK (visibility_status IN ('PUBLISHED','HIDDEN','FLAGGED')),
    CONSTRAINT CK_reviews_moderation CHECK (moderation_status IN ('NONE','OPEN','RESOLVED','DISMISSED'))
);
CREATE UNIQUE INDEX UX_reviews_booking ON dbo.reviews(booking_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX UX_reviews_subscription ON dbo.reviews(subscription_id) WHERE subscription_id IS NOT NULL;

-- Table 29 / 31
CREATE TABLE dbo.attachments (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_attachments PRIMARY KEY,
    file_id BIGINT NOT NULL,
    application_id BIGINT NULL,
    message_id BIGINT NULL,
    review_id BIGINT NULL,
    document_type VARCHAR(20) NULL,
    verification_status VARCHAR(20) NULL,
    verified_by BIGINT NULL,
    verified_at DATETIME2(3) NULL,
    verification_note NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_attachments_file FOREIGN KEY(file_id) REFERENCES dbo.files(id),
    CONSTRAINT FK_attachments_application FOREIGN KEY(application_id) REFERENCES dbo.mentor_applications(id),
    CONSTRAINT FK_attachments_message FOREIGN KEY(message_id) REFERENCES dbo.messages(id),
    CONSTRAINT FK_attachments_review FOREIGN KEY(review_id) REFERENCES dbo.reviews(id),
    CONSTRAINT FK_attachments_verifier FOREIGN KEY(verified_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_attachments_owner CHECK (
        (CASE WHEN application_id IS NULL THEN 0 ELSE 1 END
        + CASE WHEN message_id IS NULL THEN 0 ELSE 1 END
        + CASE WHEN review_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT CK_attachments_metadata CHECK (
        (application_id IS NOT NULL AND document_type IS NOT NULL
         AND document_type IN ('CV','CERTIFICATE','OTHER')
         AND verification_status IS NOT NULL AND verification_status IN ('PENDING','VERIFIED','REJECTED'))
        OR (application_id IS NULL AND document_type IS NULL AND verification_status IS NULL
            AND verified_by IS NULL AND verified_at IS NULL AND verification_note IS NULL)
    ),
    CONSTRAINT CK_attachments_verification CHECK (
        verification_status IS NULL OR verification_status = 'PENDING'
        OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);
CREATE UNIQUE INDEX UX_attachments_application ON dbo.attachments(application_id, file_id) WHERE application_id IS NOT NULL;
CREATE UNIQUE INDEX UX_attachments_message ON dbo.attachments(message_id, file_id) WHERE message_id IS NOT NULL;
CREATE UNIQUE INDEX UX_attachments_review ON dbo.attachments(review_id, file_id) WHERE review_id IS NOT NULL;
CREATE INDEX IX_attachments_file ON dbo.attachments(file_id);

-- Table 30 / 31
CREATE TABLE dbo.system_configs (
    config_key VARCHAR(150) NOT NULL CONSTRAINT PK_system_configs PRIMARY KEY,
    config_value NVARCHAR(MAX) NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    description NVARCHAR(500) NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_system_configs_updater FOREIGN KEY(updated_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_system_configs_json CHECK (ISJSON(config_value) = 1 AND LEFT(LTRIM(config_value),1) = N'{'),
    CONSTRAINT CK_system_configs_type CHECK (value_type IN ('STRING','NUMBER','BOOLEAN','JSON'))
);

-- Table 31 / 31
CREATE TABLE dbo.audit_logs (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_audit_logs PRIMARY KEY,
    actor_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id NVARCHAR(150) NULL,
    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,
    reason NVARCHAR(1000) NULL,
    correlation_id VARCHAR(100) NULL,
    retention_class VARCHAR(20) NOT NULL DEFAULT 'BUSINESS',
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_audit_logs_actor FOREIGN KEY(actor_id) REFERENCES dbo.users(id),
    CONSTRAINT CK_audit_logs_old CHECK (old_values IS NULL OR ISJSON(old_values) = 1),
    CONSTRAINT CK_audit_logs_new CHECK (new_values IS NULL OR ISJSON(new_values) = 1),
    CONSTRAINT CK_audit_logs_retention CHECK (retention_class IN ('BUSINESS','FINANCIAL','TECHNICAL'))
);

-- Query indexes
CREATE INDEX IX_users_status ON dbo.users(status);
CREATE INDEX IX_auth_identities_user ON dbo.auth_identities(user_id);
CREATE INDEX IX_security_tokens_user ON dbo.security_tokens(user_id, purpose, expires_at);
CREATE INDEX IX_mentor_profiles_discovery ON dbo.mentor_profiles(is_public, accepting_mentees) INCLUDE(job_title, company_name);
CREATE INDEX IX_files_uploader ON dbo.files(uploaded_by);
CREATE INDEX IX_mentor_applications_queue ON dbo.mentor_applications(status, submitted_at);
CREATE INDEX IX_skills_category ON dbo.skills(category_id, is_active);
CREATE INDEX IX_mentor_skills_skill ON dbo.mentor_skills(skill_id, mentor_id);
CREATE INDEX IX_offerings_discovery ON dbo.service_offerings(mentor_id, service_type, status) INCLUDE(price, currency);
CREATE INDEX IX_wishlists_mentor ON dbo.wishlists(mentor_id);
CREATE INDEX IX_requests_mentor ON dbo.mentorship_requests(mentor_id, status, response_deadline);
CREATE INDEX IX_requests_mentee ON dbo.mentorship_requests(mentee_id, status, created_at);
CREATE INDEX IX_availability_rules_mentor ON dbo.availability_rules(mentor_id, weekday, is_active);
CREATE INDEX IX_availability_exceptions_mentor ON dbo.availability_exceptions(mentor_id, start_at, end_at);
CREATE INDEX IX_slot_holds_overlap ON dbo.slot_holds(mentor_id, status, start_at) INCLUDE(end_at, expires_at);
CREATE INDEX IX_slot_holds_expiry ON dbo.slot_holds(status, expires_at);
CREATE INDEX IX_bookings_mentor_schedule ON dbo.bookings(mentor_id, status, start_at) INCLUDE(end_at);
CREATE INDEX IX_bookings_mentee_schedule ON dbo.bookings(mentee_id, status, start_at);
CREATE INDEX IX_bookings_subscription ON dbo.bookings(subscription_id, start_at) WHERE subscription_id IS NOT NULL;
CREATE INDEX IX_subscriptions_mentor ON dbo.subscriptions(mentor_id, status);
CREATE INDEX IX_subscriptions_mentee ON dbo.subscriptions(mentee_id, status);
CREATE INDEX IX_subscriptions_renewal ON dbo.subscriptions(status, next_billing_at);
CREATE INDEX IX_action_items_subscription ON dbo.action_items(subscription_id, status);
CREATE INDEX IX_payments_request ON dbo.payments(request_id, status);
CREATE INDEX IX_payments_expiry ON dbo.payments(status, expires_at);
CREATE INDEX IX_payments_revenue ON dbo.payments(status, paid_at) INCLUDE(amount, currency);
CREATE INDEX IX_payment_events_payment ON dbo.payment_events(payment_id, received_at);
CREATE INDEX IX_refunds_payment ON dbo.refunds(payment_id, status);
CREATE INDEX IX_escrow_payment ON dbo.escrow_ledger_entries(payment_id, created_at);
CREATE INDEX IX_conversations_mentee ON dbo.conversations(mentee_id, last_message_at);
CREATE INDEX IX_messages_history ON dbo.messages(conversation_id, id);
CREATE INDEX IX_audit_entity ON dbo.audit_logs(entity_type, entity_id, created_at);
CREATE INDEX IX_audit_actor ON dbo.audit_logs(actor_id, created_at);
CREATE INDEX IX_audit_action ON dbo.audit_logs(action, created_at);

-- Seed Initial Data
INSERT INTO dbo.skill_categories(name, slug, display_order) VALUES
(N'Backend', 'backend', 1),
(N'Frontend', 'frontend', 2),
(N'Data & AI', 'data-ai', 3),
(N'DevOps', 'devops', 4);

INSERT INTO dbo.skills(category_id, name, slug)
SELECT c.id, x.name, x.slug
FROM (VALUES
    ('backend', N'Java', 'java'),
    ('backend', N'Spring Boot', 'spring-boot'),
    ('backend', N'SQL Server', 'sql-server'),
    ('backend', N'REST API', 'rest-api'),
    ('frontend', N'JavaScript', 'javascript'),
    ('frontend', N'React', 'react'),
    ('data-ai', N'Python', 'python'),
    ('devops', N'Docker', 'docker')
) AS x(category_slug, name, slug)
JOIN dbo.skill_categories AS c ON c.slug = x.category_slug;

-- Seed Config: finance.commission_rate mặc định 15%; Admin có thể cập nhật
INSERT INTO dbo.system_configs(config_key, config_value, value_type, description) VALUES
('platform.name', N'{"value":"Happy Programming"}', 'STRING', N'Tên nền tảng'),
('platform.support_email', N'{"value":null}', 'STRING', N'Cần điền email hỗ trợ trước khi triển khai'),
('platform.default_currency', N'{"value":"VND"}', 'STRING', N'Tiền tệ mặc định'),
('platform.maintenance_mode', N'{"value":false}', 'BOOLEAN', N'Chế độ bảo trì'),
('auth.session_timeout_minutes', N'{"value":30}', 'NUMBER', N'Giá trị khởi tạo đề xuất'),
('payment.environment', N'{"value":"SANDBOX"}', 'STRING', N'Môi trường thanh toán'),
('payment.checkout_minutes', N'{"value":15}', 'NUMBER', N'Hạn một phiên checkout'),
('booking.slot_hold_minutes', N'{"value":10}', 'NUMBER', N'Thời gian giữ lịch'),
('booking.minimum_notice_hours', N'{"value":2}', 'NUMBER', N'Đặt lịch trước ít nhất 2 giờ'),
('booking.full_refund_notice_hours', N'{"value":24}', 'NUMBER', N'Hủy trước 24 giờ được hoàn toàn bộ'),
('booking.late_cancel_refund_percent', N'{"value":50}', 'NUMBER', N'Tỷ lệ hoàn khi hủy dưới 24 giờ'),
('mentorship.response_hours', N'{"value":48}', 'NUMBER', N'Hạn mentor phản hồi'),
('mentorship.trial_days', N'{"value":7}', 'NUMBER', N'Thử từ thời điểm kích hoạt'),
('finance.commission_rate', N'{"value":15.00}', 'NUMBER', N'Phí nền tảng mặc định 15%; Admin có thể cập nhật'),
('notification.email_enabled', N'{"value":true}', 'BOOLEAN', N'Bật email'),
('audit.technical_retention_days', N'{"value":90}', 'NUMBER', N'Chỉ áp dụng log kỹ thuật');

-- Seed Initial Admin & Staff Accounts
INSERT INTO dbo.users (
    email, role_code, password_hash, full_name, phone, bio, timezone, status, email_verified_at, created_at, updated_at
) VALUES 
('admin@happyprogramming.vn', 'ADMIN', '$2a$12$e0MYzXyjpJS7Pd0RVvHwHe1v5s1tQ/XkQpQk9Q.Nq7JgV8vY5Z6aK', N'System Administrator', '0900000000', N'System Admin Account', 'Asia/Ho_Chi_Minh', 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME()),
('staff@happyprogramming.vn', 'STAFF', '$2a$12$e0MYzXyjpJS7Pd0RVvHwHe1v5s1tQ/XkQpQk9Q.Nq7JgV8vY5Z6aK', N'Operational Staff', '0911111111', N'Operational Staff Account', 'Asia/Ho_Chi_Minh', 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME());

-- Triggers
EXEC(N'CREATE TRIGGER dbo.trg_escrow_immutable
ON dbo.escrow_ledger_entries INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51001, ''Ledger entries are immutable. Insert a reversal instead.'', 1;
END;');

EXEC(N'CREATE TRIGGER dbo.trg_subscription_accepted_request
ON dbo.subscriptions AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.mentorship_requests AS r ON r.id = i.request_id
        WHERE r.status <> ''ACCEPTED''
    )
        THROW 51002, ''A subscription requires an accepted mentorship request.'', 1;
END;');

EXEC(N'CREATE TRIGGER dbo.trg_payment_one_off_target
ON dbo.payments AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.bookings AS b ON b.id = i.booking_id
        WHERE b.booking_type <> ''ONE_OFF''
    )
        THROW 51003, ''Included monthly calls must not be charged as one-off bookings.'', 1;
END;');

-- Trigger reviews đã hỗ trợ cả booking hoàn thành và subscription đang hoạt động
EXEC(N'CREATE TRIGGER dbo.trg_reviews_target_valid
ON dbo.reviews AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- Kiểm tra nếu là booking thì phải COMPLETED
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.bookings AS b ON b.id = i.booking_id
        WHERE b.status <> ''COMPLETED''
    )
        THROW 51004, ''Only completed bookings may be reviewed.'', 1;

    -- Kiểm tra nếu là subscription thì phải ACTIVE hoặc ENDED (không cho review khi đang TRIALING hoặc CANCELED trước khi active)
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.subscriptions AS s ON s.id = i.subscription_id
        WHERE s.status NOT IN (''ACTIVE'', ''ENDED'')
    )
        THROW 51014, ''Only active or completed monthly subscriptions may be reviewed.'', 1;
END;');

EXEC(N'CREATE TRIGGER dbo.trg_attachments_validate
ON dbo.attachments AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.files f ON f.id = i.file_id WHERE f.status <> ''READY'')
        THROW 51005, ''Attachments require a READY file.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN dbo.files f ON f.id = i.file_id
        JOIN dbo.mentor_applications a ON a.id = i.application_id
        WHERE f.uploaded_by <> a.applicant_id OR f.size_bytes > 10485760 OR f.mime_type <> ''application/pdf''
    ) THROW 51007, ''Application document must be applicant-owned PDF of at most 10 MiB.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN dbo.files f ON f.id = i.file_id
        JOIN dbo.messages m ON m.id = i.message_id WHERE f.uploaded_by <> m.sender_id
    ) THROW 51008, ''Message attachment must belong to the sender.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN dbo.files f ON f.id = i.file_id
        JOIN dbo.reviews r ON r.id = i.review_id 
        LEFT JOIN dbo.bookings b ON b.id = r.booking_id
        LEFT JOIN dbo.subscriptions s ON s.id = r.subscription_id
        WHERE (r.booking_id IS NOT NULL AND f.uploaded_by <> b.mentee_id)
           OR (r.subscription_id IS NOT NULL AND f.uploaded_by <> s.mentee_id)
           OR f.size_bytes > 10485760
           OR f.mime_type NOT IN (''image/png'',''image/jpeg'',''application/pdf'',''application/zip'',''application/x-zip-compressed'')
    ) THROW 51009, ''Review evidence must be reviewer-owned PNG/JPEG/PDF/ZIP of at most 10 MiB.'', 1;
END;');

-- Set-based validation of config JSON shape and value type
EXEC(N'CREATE TRIGGER dbo.trg_system_configs_shape
ON dbo.system_configs AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS c
        CROSS APPLY (SELECT COUNT(*) AS key_count FROM OPENJSON(c.config_value)) AS k
        WHERE k.key_count <> 1
           OR NOT EXISTS (
                SELECT 1 FROM OPENJSON(c.config_value) AS j
                WHERE j.[key] COLLATE Latin1_General_100_BIN2 = N''value''
                  AND (j.[type] = 0
                    OR (c.value_type = ''STRING'' AND j.[type] = 1)
                    OR (c.value_type = ''NUMBER'' AND j.[type] = 2)
                    OR (c.value_type = ''BOOLEAN'' AND j.[type] = 3)
                    OR (c.value_type = ''JSON'' AND j.[type] IN (4,5)))
           )
    )
        THROW 51006, ''Config requires exactly one value property matching value_type; null is allowed.'', 1;
END;');

EXEC(N'CREATE TRIGGER dbo.trg_staff_permission_grant
ON dbo.user_permissions AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.users u ON u.id=i.user_id
               JOIN dbo.users a ON a.id=i.assigned_by
               WHERE u.role_code <> ''STAFF'' OR a.role_code <> ''ADMIN'' OR a.status <> ''ACTIVE'')
        THROW 51010, ''Grant permissions to STAFF with an active ADMIN assigner.'', 1;
END;');

EXEC(N'CREATE TRIGGER dbo.trg_user_role_grants
ON dbo.users AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.user_permissions p ON p.user_id=i.id WHERE i.role_code <> ''STAFF'')
        THROW 51011, ''Revoke staff grants before changing the staff role.'', 1;
END;');

-- Seed Staff Permissions (Assigned by active ADMIN user)
INSERT INTO dbo.user_permissions (user_id, permission_code, assigned_by, assigned_at)
SELECT u_staff.id, p.code, u_admin.id, SYSUTCDATETIME()
FROM dbo.users u_staff
CROSS JOIN dbo.users u_admin
CROSS JOIN (VALUES 
    ('MENTOR_APPLICATION_MANAGE'),
    ('MENTEE_MANAGE'),
    ('MENTORSHIP_REQUEST_MANAGE'),
    ('SKILL_MANAGE')
) AS p(code)
WHERE u_staff.email_normalized = 'staff@happyprogramming.vn'
  AND u_admin.email_normalized = 'admin@happyprogramming.vn';



EXEC(N'CREATE TRIGGER dbo.trg_subscription_funded_activation
ON dbo.subscriptions AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted i WHERE i.status IN (''TRIALING'',''ACTIVE'',''PAST_DUE'')
        AND NOT EXISTS (SELECT 1 FROM dbo.payments p
                        WHERE p.request_id=i.request_id AND p.status=''SUCCEEDED''
                          AND p.amount=i.agreed_price AND p.currency=i.currency)
    ) THROW 51013, ''Subscription activation requires matching successful initial payment.'', 1;
END;');

DROP TRIGGER IF EXISTS dbo.trg_request_funded_review;
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_status;
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_status CHECK (status IN ('DRAFT','PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED'));
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_funded;
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_funded CHECK (funded_at IS NULL OR (status = 'ACCEPTED' AND responded_at IS NOT NULL AND funded_at >= responded_at));
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_deadline;
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_deadline CHECK ((status = 'DRAFT' AND submitted_at IS NULL AND response_deadline IS NULL) OR (status <> 'DRAFT' AND submitted_at IS NOT NULL AND response_deadline IS NOT NULL AND response_deadline = DATEADD(HOUR,48,submitted_at)));
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_review_ready;
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_review_ready CHECK (status = 'ACCEPTED' OR funded_at IS NULL);
ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_response;
ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_response CHECK ((status IN ('ACCEPTED','REJECTED') AND responded_at IS NOT NULL AND submitted_at IS NOT NULL AND responded_at >= submitted_at AND responded_at <= response_deadline) OR (status IN ('DRAFT','PENDING','EXPIRED') AND responded_at IS NULL) OR (status='CANCELLED' AND (responded_at IS NULL OR (submitted_at IS NOT NULL AND responded_at>=submitted_at AND responded_at<=response_deadline))));
-- Keep the accepted request as immutable historical approval after payment.
-- Cancel/refund paid mentorship through subscriptions/refunds, not request status.
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_request_approval_flow
ON dbo.mentorship_requests AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id=i.id
   WHERE d.id IS NULL AND i.status NOT IN (''DRAFT'',''PENDING''))
   THROW 51101, ''New applications must start as DRAFT or PENDING.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE i.status <> d.status AND NOT (
     (d.status=''DRAFT'' AND i.status=''PENDING'') OR
     (d.status=''PENDING'' AND i.status IN (''ACCEPTED'',''REJECTED'',''EXPIRED'',''CANCELLED'')) OR
     (d.status=''ACCEPTED'' AND i.status=''CANCELLED'' AND d.funded_at IS NULL)))
   THROW 51102, ''Invalid application status transition.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE d.status <> ''DRAFT'' AND
   (i.mentee_id<>d.mentee_id OR i.mentor_id<>d.mentor_id OR i.service_id<>d.service_id
    OR i.submitted_at<>d.submitted_at OR i.response_deadline<>d.response_deadline
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
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_payment_accepted_request
ON dbo.payments AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 -- Serialize review/cancellation with checkout through the same request row.
 IF EXISTS (SELECT 1 FROM inserted i
   JOIN dbo.mentorship_requests r WITH (UPDLOCK,HOLDLOCK) ON r.id=i.request_id
   LEFT JOIN deleted d ON d.id=i.id
   WHERE (d.id IS NULL OR i.status IN (''PENDING'',''SUCCEEDED''))
     AND (r.status <> ''ACCEPTED'' OR r.responded_at IS NULL OR i.created_at < r.responded_at
       OR (i.paid_at IS NOT NULL AND i.paid_at < r.responded_at)))
   THROW 51107, ''Monthly checkout requires mentor acceptance before payment.'', 1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
   WHERE ISNULL(i.request_id,-1)<>ISNULL(d.request_id,-1)
      OR ISNULL(i.booking_id,-1)<>ISNULL(d.booking_id,-1)
      OR ISNULL(i.subscription_id,-1)<>ISNULL(d.subscription_id,-1)
      OR i.amount<>d.amount OR i.currency<>d.currency
      OR i.commission_rate_snapshot<>d.commission_rate_snapshot
      OR i.created_at<>d.created_at
      OR (d.status=''SUCCEEDED'' AND (i.status<>''SUCCEEDED'' OR i.paid_at<>d.paid_at)))
   THROW 51108, ''Payment target, amount, fee snapshot and successful result are immutable.'', 1;
END;');
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_subscription_funded_activation
ON dbo.subscriptions AFTER INSERT, UPDATE
AS
BEGIN
 SET NOCOUNT ON;
 -- Check the original funding for every new subscription, including terminal imports.
 -- On later updates do not demand current-period dates equal the initial period.
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.id=i.id
   WHERE (d.id IS NULL OR i.status IN (''TRIALING'',''ACTIVE'',''PAST_DUE''))
   AND NOT EXISTS (
     SELECT 1 FROM dbo.mentorship_requests r
     JOIN dbo.payments p ON p.request_id=r.id
     JOIN dbo.escrow_ledger_entries e ON e.payment_id=p.id
     WHERE r.id=i.request_id AND r.status=''ACCEPTED''
       AND p.status=''SUCCEEDED'' AND p.paid_at=r.funded_at
       AND p.amount=i.agreed_price AND p.currency=i.currency
       AND e.entry_type=''HOLD'' AND e.reversal_of_id IS NULL AND e.amount=p.amount
       AND i.activated_at IS NOT NULL AND i.activated_at>=p.paid_at
       AND (d.id IS NOT NULL OR
         (i.status=''TRIALING'' AND i.current_period_start=i.activated_at
          AND i.trial_ends_at=DATEADD(DAY,7,i.activated_at)
          AND p.billing_period_start=i.current_period_start
          AND p.billing_period_end=i.current_period_end))))
   THROW 51109, ''Activate after accepted request, verified payment and escrow HOLD; start 7-day trial.'', 1;
END;');
DECLARE @subscription_default SYSNAME;
DECLARE @drop_default_sql NVARCHAR(500);
SELECT @subscription_default=d.name FROM sys.default_constraints d
JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
WHERE d.parent_object_id=OBJECT_ID(N'dbo.subscriptions') AND c.name=N'status';
IF @subscription_default IS NOT NULL
BEGIN
    SET @drop_default_sql = N'ALTER TABLE dbo.subscriptions DROP CONSTRAINT ' + QUOTENAME(@subscription_default);
    EXEC sp_executesql @drop_default_sql;
END;
ALTER TABLE dbo.subscriptions ADD CONSTRAINT DF_subscriptions_status DEFAULT 'TRIALING' FOR status;

COMMIT TRANSACTION;

SELECT COUNT(*) AS table_count FROM sys.tables WHERE is_ms_shipped = 0;
SELECT name AS table_name FROM sys.tables WHERE is_ms_shipped = 0 ORDER BY name;
PRINT N'HappyProgramming checked revision: created 31 tables, constraints, indexes, triggers, and seed data successfully.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
