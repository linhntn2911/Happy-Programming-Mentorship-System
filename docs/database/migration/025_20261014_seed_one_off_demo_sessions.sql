-- Migration 025: Seed demo ONE_OFF sessions so the mentor one-off request flow is exercisable.
-- Date: 2026-10-14
--
-- The "Book a one-off session" approval flow (migration 024) lets a mentee request a published
-- ONE_OFF service offering and the mentor accept/decline it like a monthly request. The public
-- offerings API already returns ONE_OFF rows, but mentors cannot yet publish one-off sessions
-- through the Packages UI (it manages MONTHLY tiers only), so no ONE_OFF offering exists and the
-- flow could never be triggered. This seeds a small, idempotent set of demo one-off sessions for
-- the existing public demo mentors to bridge that gap.
--
-- This is temporary development seed data (AGENTS.md): it is read only through the offerings
-- Repository/API and must be removed once mentor self-service one-off publishing is implemented.
-- ONE_OFF rows must satisfy CK_service_offerings_calls (calls_per_period NULL) and
-- CK_service_offerings_trial (trial_days = 0).
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = 11)
   AND NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = 11 AND service_type = 'ONE_OFF' AND name = N'Code review sprint')
    INSERT INTO dbo.service_offerings
        (mentor_id, name, service_type, plan_tier, description, price, currency,
         session_duration_minutes, calls_per_period, chat_included,
         response_time_hours, trial_days, benefits, status, display_order,
         created_at, updated_at)
    VALUES
        (11, N'Code review sprint', 'ONE_OFF', NULL,
         N'A focused 60-minute review of one pull request or code sample, covering structure, readability, tests and concrete next steps.',
         400000, 'VND', 60, NULL, 1, 24, 0, N'[]', 'ACTIVE', 0,
         SYSUTCDATETIME(), SYSUTCDATETIME());

IF EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = 11)
   AND NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = 11 AND service_type = 'ONE_OFF' AND name = N'Career Q&A session')
    INSERT INTO dbo.service_offerings
        (mentor_id, name, service_type, plan_tier, description, price, currency,
         session_duration_minutes, calls_per_period, chat_included,
         response_time_hours, trial_days, benefits, status, display_order,
         created_at, updated_at)
    VALUES
        (11, N'Career Q&A session', 'ONE_OFF', NULL,
         N'A 45-minute one-off conversation about your CV, interview preparation and career direction as a software engineer.',
         300000, 'VND', 45, NULL, 1, 24, 0, N'[]', 'ACTIVE', 1,
         SYSUTCDATETIME(), SYSUTCDATETIME());

IF EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = 393)
   AND NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = 393 AND service_type = 'ONE_OFF' AND name = N'System design consult')
    INSERT INTO dbo.service_offerings
        (mentor_id, name, service_type, plan_tier, description, price, currency,
         session_duration_minutes, calls_per_period, chat_included,
         response_time_hours, trial_days, benefits, status, display_order,
         created_at, updated_at)
    VALUES
        (393, N'System design consult', 'ONE_OFF', NULL,
         N'A 60-minute one-off consultation on a specific system design question, with an architecture review and pragmatic recommendations.',
         500000, 'VND', 60, NULL, 1, 24, 0, N'[]', 'ACTIVE', 0,
         SYSUTCDATETIME(), SYSUTCDATETIME());

COMMIT TRANSACTION;
