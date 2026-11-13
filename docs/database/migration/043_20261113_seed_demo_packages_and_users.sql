-- ============================================================================
-- HappyProgramming Mentorship System (HPMS)
-- Migration: 034_20261113_seed_demo_packages_and_users.sql
-- Description: Provision demo accounts and service offerings for end-to-end web testing:
--              1. Set active password for seed mentor (seed.minh-an@happyprogramming.local) -> Staff@123
--              2. Create/update active mentee account (mentee@happyprogramming.vn) -> Staff@123
--              3. Seed active service offerings (Monthly & One-Off) for mentor Minh An (id 12)
-- ============================================================================

USE [HappyProgramming];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRANSACTION;

-- 1. Ensure seed mentor seed.minh-an@happyprogramming.local has active password 'Staff@123'
UPDATE dbo.users
SET password_hash = '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW', -- Staff@123
    status = 'ACTIVE',
    failed_login_count = 0,
    locked_until = NULL,
    updated_at = SYSUTCDATETIME()
WHERE email_normalized = 'seed.minh-an@happyprogramming.local';

-- 2. Ensure mentee@happyprogramming.vn exists with active password 'Staff@123'
DECLARE @menteeId BIGINT;
SELECT @menteeId = id FROM dbo.users WHERE email_normalized = 'mentee@happyprogramming.vn';

IF @menteeId IS NULL
BEGIN
    INSERT INTO dbo.users (email, role_code, full_name, first_name, last_name, password_hash, status, email_verified_at, created_at, updated_at)
    VALUES (
        'mentee@happyprogramming.vn',
        'MENTEE',
        N'Pham Minh Mentee',
        N'Minh',
        N'Pham',
        '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW', -- Staff@123
        'ACTIVE',
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
    SET @menteeId = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE dbo.users
    SET password_hash = '$2a$12$16PKajFpmuKxHjLBZrblZO99Qj5Kjqaen9SQmsr9pGVOTSmFTwgUW',
        status = 'ACTIVE',
        email_verified_at = COALESCE(email_verified_at, SYSUTCDATETIME()),
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE id = @menteeId;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = @menteeId AND role_code = 'MENTEE')
    INSERT INTO dbo.user_roles (user_id, role_code) VALUES (@menteeId, 'MENTEE');

-- 3. Seed active service offerings for mentor Minh An (id 12)
DECLARE @mentorId BIGINT;
SELECT @mentorId = id FROM dbo.users WHERE email_normalized = 'seed.minh-an@happyprogramming.local';

IF @mentorId IS NOT NULL
BEGIN
    -- Monthly Mentorship package
    IF NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'MONTHLY')
    BEGIN
        INSERT INTO dbo.service_offerings (
            mentor_id, name, service_type, description, price, currency,
            session_duration_minutes, calls_per_period, chat_included,
            response_time_hours, trial_days, benefits, status, display_order, plan_tier,
            created_at, updated_at
        )
        VALUES (
            @mentorId,
            N'Java & Spring Boot Mastery',
            'MONTHLY',
            N'Build a solid Java foundation, design clean REST APIs, and get 1-on-1 code reviews with weekly sync calls.',
            2500000,
            'VND',
            60,
            4,
            1,
            24,
            7,
            N'["Weekly 1-on-1 calls", "Direct chat support", "Code reviews", "7-day risk-free trial"]',
            'ACTIVE',
            1,
            'STANDARD',
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );
    END;

    -- One-Off Session package
    IF NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'ONE_OFF')
    BEGIN
        INSERT INTO dbo.service_offerings (
            mentor_id, name, service_type, description, price, currency,
            session_duration_minutes, calls_per_period, chat_included,
            response_time_hours, trial_days, benefits, status, display_order, plan_tier,
            created_at, updated_at
        )
        VALUES (
            @mentorId,
            N'1-on-1 Architecture & Code Consultation',
            'ONE_OFF',
            N'45-minute deep-dive consultation on software architecture, Spring Boot issues, or CV review.',
            500000,
            'VND',
            45,
            NULL,
            1,
            24,
            0,
            N'["45-minute Google Meet", "Architecture guidance", "Actionable feedback"]',
            'ACTIVE',
            2,
            NULL,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );
    END;
END;

COMMIT TRANSACTION;
GO
