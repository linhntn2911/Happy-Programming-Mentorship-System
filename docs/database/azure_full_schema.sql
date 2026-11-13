/*
============================================================================
HappyProgramming Database Script for Azure SQL Database
- Giữ nguyên 100% tất cả 31 bảng gốc, các cột, migration, trigger, seed data
- Đã loại bỏ các lệnh USE [master] / USE [HappyProgramming] để tương thích Azure SQL
- Đã sửa các ký tự gõ nhầm (cho, cchotoi)
============================================================================
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

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

-- Table 28 / 31
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

-- Seed Config
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

EXEC(N'CREATE TRIGGER dbo.trg_reviews_target_valid
ON dbo.reviews AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.bookings AS b ON b.id = i.booking_id
        WHERE b.status <> ''COMPLETED''
    )
        THROW 51004, ''Only completed bookings may be reviewed.'', 1;

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
PRINT N'Created 31 tables, constraints, indexes, triggers, and seed data successfully.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Schema extensions & columns
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'first_name')
    ALTER TABLE dbo.users ADD first_name NVARCHAR(75) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'last_name')
    ALTER TABLE dbo.users ADD last_name NVARCHAR(75) NULL;

BEGIN TRANSACTION;
IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_roles (
        user_id BIGINT NOT NULL REFERENCES dbo.users(id),
        role_code VARCHAR(20) NOT NULL,
        CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_code),
        CONSTRAINT CK_user_roles_code CHECK (role_code IN ('MENTEE','MENTOR','STAFF','ADMIN'))
    );
END;
INSERT INTO dbo.user_roles(user_id, role_code)
SELECT u.id, u.role_code FROM dbo.users u
WHERE NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code=u.role_code);
INSERT INTO dbo.user_roles(user_id, role_code)
SELECT u.id, 'MENTEE' FROM dbo.users u
WHERE u.role_code='MENTOR'
AND NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code='MENTEE');

IF COL_LENGTH('dbo.mentor_applications','otp_hash') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_applications ADD
        otp_hash VARCHAR(100) NULL,
        otp_expires_at DATETIME2(3) NULL,
        otp_sent_at DATETIME2(3) NULL,
        otp_attempts INT NOT NULL CONSTRAINT DF_mentor_applications_otp_attempts DEFAULT 0,
        cv_file_name NVARCHAR(200) NULL,
        cv_content VARBINARY(MAX) NULL;
END;
COMMIT TRANSACTION;

-- Profile Extensions
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.users', 'learning_goals') IS NULL
    ALTER TABLE dbo.users ADD learning_goals NVARCHAR(2000) NULL;
IF COL_LENGTH('dbo.files', 'avatar_content') IS NULL
    ALTER TABLE dbo.files ADD avatar_content VARBINARY(MAX) NULL;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.users') AND name='CK_users_level')
    ALTER TABLE dbo.users DROP CONSTRAINT CK_users_level;
ALTER TABLE dbo.users WITH CHECK ADD CONSTRAINT CK_users_level
    CHECK (experience_level IN ('BEGINNER','FRESHER','JUNIOR','MID','SENIOR'));
COMMIT TRANSACTION;

-- Seed Admin & Staff Accounts
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'admin@happyprogramming.vn')
BEGIN
    INSERT INTO dbo.users (
        email, role_code, password_hash, full_name, phone, bio, timezone, status,
        email_verified_at, created_at, updated_at
    ) VALUES (
        'admin@happyprogramming.vn', 'ADMIN',
        '$2a$12$uBvGINEQ9Bikd5Op33kFuO9X5h2cebsUcdgUmFoXZiECQbhCuBdAu', -- Admin@123
        N'System Administrator', '0900000000', N'Platform System Administrator Account',
        'Asia/Ho_Chi_Minh', 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email_normalized = 'staff@happyprogramming.vn')
BEGIN
    INSERT INTO dbo.users (
        email, role_code, password_hash, full_name, phone, bio, timezone, status,
        email_verified_at, created_at, updated_at
    ) VALUES (
        'staff@happyprogramming.vn', 'STAFF',
        '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW', -- Staff@123
        N'Nguyen Van Staff', '0911111111', N'Platform Operational Staff Account',
        'Asia/Ho_Chi_Minh', 'ACTIVE', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME()
    );
END;

DECLARE @admin_id BIGINT = (SELECT id FROM dbo.users WHERE email_normalized = 'admin@happyprogramming.vn');
DECLARE @staff_id BIGINT = (SELECT id FROM dbo.users WHERE email_normalized = 'staff@happyprogramming.vn');

IF @admin_id IS NOT NULL AND @staff_id IS NOT NULL
BEGIN
    INSERT INTO dbo.user_permissions (user_id, permission_code, assigned_by, assigned_at)
    SELECT @staff_id, p.code, @admin_id, SYSUTCDATETIME()
    FROM (VALUES 
        ('MENTOR_APPLICATION_MANAGE'),
        ('MENTEE_MANAGE'),
        ('MENTORSHIP_REQUEST_MANAGE'),
        ('SKILL_MANAGE')
    ) AS p(code)
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.user_permissions 
        WHERE user_id = @staff_id AND permission_code = p.code
    );
END;
COMMIT TRANSACTION;

-- Audit log immutable trigger
IF COL_LENGTH('dbo.audit_logs', 'ip_address') IS NULL
    ALTER TABLE dbo.audit_logs ADD ip_address VARCHAR(45) NULL;
EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_audit_logs_immutable
ON dbo.audit_logs INSTEAD OF UPDATE, DELETE
AS
BEGIN
    THROW 51020, ''Audit records are immutable.'', 1;
END');

-- Notifications table
IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        id BIGINT IDENTITY(1,1) NOT NULL,
        user_id BIGINT NOT NULL,
        title NVARCHAR(250) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        type VARCHAR(50) NOT NULL,
        action_url VARCHAR(255) NULL,
        is_read BIT NOT NULL CONSTRAINT df_notifications_is_read DEFAULT 0,
        created_at DATETIME2(7) NOT NULL CONSTRAINT df_notifications_created_at DEFAULT SYSUTCDATETIME(),
        read_at DATETIME2(7) NULL,
        CONSTRAINT pk_notifications PRIMARY KEY CLUSTERED (id ASC),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX ix_notifications_user_created 
    ON dbo.notifications (user_id ASC, is_read ASC, created_at DESC);
END;

-- Service offering plan tier
IF COL_LENGTH('dbo.service_offerings', 'plan_tier') IS NULL
    ALTER TABLE dbo.service_offerings ADD plan_tier VARCHAR(20) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_service_offerings_plan_tier')
    ALTER TABLE dbo.service_offerings
        ADD CONSTRAINT CK_service_offerings_plan_tier
        CHECK (plan_tier IS NULL OR plan_tier IN ('LITE', 'STANDARD', 'PRO'));

UPDATE dbo.service_offerings
SET plan_tier = 'STANDARD', updated_at = SYSUTCDATETIME()
WHERE service_type = 'MONTHLY' AND plan_tier IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_offerings_mentor_tier')
    CREATE UNIQUE INDEX UX_offerings_mentor_tier
        ON dbo.service_offerings (mentor_id, plan_tier)
        WHERE service_type = 'MONTHLY' AND plan_tier IS NOT NULL;

-- Payout requests table
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_type')
    ALTER TABLE dbo.escrow_ledger_entries DROP CONSTRAINT CK_escrow_type;
ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_type
    CHECK (entry_type IN ('HOLD','REFUND_OUT','MENTOR_RELEASE','PLATFORM_FEE','MENTOR_PAYOUT'));

IF OBJECT_ID(N'dbo.mentor_payout_requests', N'U') IS NULL
EXEC(N'CREATE TABLE dbo.mentor_payout_requests (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_mentor_payout_requests PRIMARY KEY,
    mentor_id BIGINT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    bank_name NVARCHAR(100) NOT NULL,
    account_name NVARCHAR(150) NOT NULL,
    account_number_ciphertext NVARCHAR(500) NOT NULL,
    account_last4 CHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL CONSTRAINT DF_mentor_payout_requests_status DEFAULT ''REQUESTED'',
    transfer_reference NVARCHAR(150) NULL,
    rejection_reason NVARCHAR(500) NULL,
    reviewed_by BIGINT NULL,
    requested_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_payout_requests_requested_at DEFAULT SYSUTCDATETIME(),
    reviewed_at DATETIME2(3) NULL,
    CONSTRAINT FK_mentor_payout_requests_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id),
    CONSTRAINT FK_mentor_payout_requests_reviewer FOREIGN KEY(reviewed_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_mentor_payout_requests_amount CHECK (amount > 0),
    CONSTRAINT CK_mentor_payout_requests_status CHECK (status IN (''REQUESTED'',''PAID'',''REJECTED'')),
    CONSTRAINT CK_mentor_payout_requests_review CHECK (
        (status = ''REQUESTED'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
        OR (status = ''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)), '''') IS NOT NULL AND rejection_reason IS NULL)
        OR (status = ''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)), '''') IS NOT NULL AND transfer_reference IS NULL)
    )
);');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.mentor_payout_requests') AND name=N'IX_mentor_payout_requests_mentor')
    EXEC(N'CREATE INDEX IX_mentor_payout_requests_mentor ON dbo.mentor_payout_requests(mentor_id, requested_at DESC)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.mentor_payout_requests') AND name=N'IX_mentor_payout_requests_queue')
    EXEC(N'CREATE INDEX IX_mentor_payout_requests_queue ON dbo.mentor_payout_requests(status, requested_at, id)');

IF COL_LENGTH(N'dbo.escrow_ledger_entries', N'payout_request_id') IS NULL
    ALTER TABLE dbo.escrow_ledger_entries ADD payout_request_id BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'FK_escrow_payout_request')
    EXEC(N'ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT FK_escrow_payout_request
        FOREIGN KEY(payout_request_id) REFERENCES dbo.mentor_payout_requests(id)');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_payout_reference')
    EXEC(N'ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_payout_reference
    CHECK ((entry_type = ''MENTOR_PAYOUT'' AND payout_request_id IS NOT NULL)
        OR (entry_type <> ''MENTOR_PAYOUT'' AND payout_request_id IS NULL))');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'IX_escrow_payout_request')
    EXEC(N'CREATE INDEX IX_escrow_payout_request ON dbo.escrow_ledger_entries(payout_request_id)
        WHERE payout_request_id IS NOT NULL');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'UX_escrow_mentor_release')
    EXEC(N'CREATE UNIQUE INDEX UX_escrow_mentor_release ON dbo.escrow_ledger_entries(payment_id)
        WHERE entry_type = ''MENTOR_RELEASE'' AND reversal_of_id IS NULL');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'UX_escrow_platform_fee')
    EXEC(N'CREATE UNIQUE INDEX UX_escrow_platform_fee ON dbo.escrow_ledger_entries(payment_id)
        WHERE entry_type = ''PLATFORM_FEE'' AND reversal_of_id IS NULL');

EXEC(N'CREATE OR ALTER TRIGGER dbo.trg_mentor_payout_request_lifecycle
ON dbo.mentor_payout_requests AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
        THROW 51110, ''Payout request history cannot be deleted.'', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
        WHERE d.status <> ''REQUESTED'' OR i.status NOT IN (''PAID'',''REJECTED'')
           OR d.mentor_id <> i.mentor_id OR d.amount <> i.amount
           OR d.bank_name <> i.bank_name OR d.account_name <> i.account_name
           OR d.account_number_ciphertext <> i.account_number_ciphertext
           OR d.account_last4 <> i.account_last4 OR d.requested_at <> i.requested_at
    )
        THROW 51111, ''Payout requests allow one terminal decision and immutable request details.'', 1;
END');
COMMIT TRANSACTION;

-- File content and mentor bank accounts
IF COL_LENGTH('dbo.files', 'file_content') IS NULL
    ALTER TABLE dbo.files ADD file_content VARBINARY(MAX) NULL;

BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.mentor_bank_accounts', N'U') IS NULL
EXEC(N'CREATE TABLE dbo.mentor_bank_accounts (
    mentor_id BIGINT NOT NULL CONSTRAINT PK_mentor_bank_accounts PRIMARY KEY,
    bank_name NVARCHAR(100) NOT NULL,
    account_name NVARCHAR(150) NOT NULL,
    account_number_ciphertext NVARCHAR(500) NOT NULL,
    account_last4 CHAR(4) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_bank_accounts_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_mentor_bank_accounts_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_mentor_bank_accounts_mentor FOREIGN KEY(mentor_id) REFERENCES dbo.mentor_profiles(user_id)
)');

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.security_tokens') AND name=N'CK_security_tokens_purpose')
    ALTER TABLE dbo.security_tokens DROP CONSTRAINT CK_security_tokens_purpose;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.security_tokens') AND name=N'CK_security_tokens_purpose')
    EXEC(N'ALTER TABLE dbo.security_tokens ADD CONSTRAINT CK_security_tokens_purpose
        CHECK (purpose IN (''VERIFY_EMAIL'',''RESET_PASSWORD'',''PAYOUT''))');
COMMIT TRANSACTION;

-- Allow one-off requests
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'CK_requests_type')
    ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_type;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'CK_requests_type')
    EXEC(N'ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_type CHECK (service_type IN (''MONTHLY'',''ONE_OFF''))');

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'UX_requests_pending_pair')
    DROP INDEX UX_requests_pending_pair ON dbo.mentorship_requests;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'UX_requests_pending_pair')
    CREATE UNIQUE INDEX UX_requests_pending_pair
        ON dbo.mentorship_requests(mentee_id, mentor_id, service_type)
        WHERE status = 'PENDING';
COMMIT TRANSACTION;

-- Platform Operations Config
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.system_configs WITH (UPDLOCK,HOLDLOCK) WHERE config_key='platform.operations')
INSERT INTO dbo.system_configs(config_key,config_value,value_type,description)
VALUES ('platform.operations',N'{"value":{"maintenance":false,"announcement":"","otpResendSeconds":60,"otpExpiryMinutes":10,"withdrawalThreshold":10000,"withdrawalFee":0,"earningsHoldDays":7}}','JSON','Administrator operational controls');
IF COL_LENGTH('dbo.payments','earnings_hold_days') IS NULL
ALTER TABLE dbo.payments ADD earnings_hold_days INT NOT NULL CONSTRAINT DF_payments_hold_days DEFAULT 7 CONSTRAINT CK_payments_hold_days CHECK(earnings_hold_days BETWEEN 1 AND 90);
IF COL_LENGTH('dbo.mentor_payout_requests','fee_amount') IS NULL
ALTER TABLE dbo.mentor_payout_requests ADD fee_amount DECIMAL(18,0) NOT NULL CONSTRAINT DF_payout_fee DEFAULT 0, CONSTRAINT CK_payout_fee CHECK(fee_amount>=0 AND fee_amount<amount);
COMMIT TRANSACTION;

-- Payout approvals
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_by') IS NULL
    ALTER TABLE dbo.mentor_payout_requests ADD approved_by BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_mentor_payout_requests_approver')
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_approver FOREIGN KEY (approved_by) REFERENCES dbo.users(id);
IF COL_LENGTH('dbo.mentor_payout_requests', 'approved_at') IS NULL
    ALTER TABLE dbo.mentor_payout_requests ADD approved_at DATETIME2(3) NULL;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_status')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_status;
ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_status CHECK (status IN ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_mentor_payout_requests_review')
    ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_review;

EXEC(N'ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_review CHECK (
    (status = ''REQUESTED'' AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = ''APPROVED'' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
    OR (status = ''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)), '''') IS NOT NULL AND rejection_reason IS NULL)
    OR (status = ''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)), '''') IS NOT NULL AND transfer_reference IS NULL)
)');

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

-- Disputes Table & Responses
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

IF OBJECT_ID('dbo.disputes', 'U') IS NULL
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
    CREATE UNIQUE INDEX UX_disputes_active_booking ON dbo.disputes(booking_id) WHERE booking_id IS NOT NULL AND resolved_at IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'UX_disputes_active_subscription')
    CREATE UNIQUE INDEX UX_disputes_active_subscription ON dbo.disputes(subscription_id) WHERE subscription_id IS NOT NULL AND resolved_at IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'IX_disputes_complainant_created')
    CREATE INDEX IX_disputes_complainant_created ON dbo.disputes(complainant_id, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.disputes') AND name=N'IX_disputes_payment_status')
    CREATE INDEX IX_disputes_payment_status ON dbo.disputes(payment_id, status);

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

IF COL_LENGTH('dbo.disputes', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_receipt_file FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_receipt_file FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_url') IS NULL
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_url NVARCHAR(1000) NULL;

COMMIT TRANSACTION;

PRINT N'Database schema and tables initialized successfully.';

