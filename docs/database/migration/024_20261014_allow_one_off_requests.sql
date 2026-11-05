-- Migration 024: Allow one-off session requests in dbo.mentorship_requests
-- Date: 2026-10-14
--
-- The "Book a one-off session" flow reuses the approval-first mentorship_requests lifecycle:
-- a mentee submits a request for a published ONE_OFF service offering, it lands as PENDING, and
-- the mentor accepts/declines exactly like a monthly request (no payment in this iteration).
-- Two baseline rules currently block service_type = 'ONE_OFF':
--   1. CK_requests_type restricts service_type to 'MONTHLY'.
--   2. UX_requests_pending_pair is unique on (mentee_id, mentor_id) for PENDING rows, which would
--      stop a mentee from having a pending one-off alongside a pending monthly with the same mentor.
-- This migration relaxes both. The immutable init baseline is never edited.
--
-- Idempotent so it is safe against partial or manually reconciled databases.
-- SET QUOTED_IDENTIFIER ON is required to (re)create the filtered unique index.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

-- 1. Widen the request type check to admit one-off sessions.
IF EXISTS (SELECT 1 FROM sys.check_constraints
           WHERE parent_object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'CK_requests_type')
    ALTER TABLE dbo.mentorship_requests DROP CONSTRAINT CK_requests_type;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE parent_object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'CK_requests_type')
    EXEC(N'ALTER TABLE dbo.mentorship_requests WITH CHECK ADD CONSTRAINT CK_requests_type
        CHECK (service_type IN (''MONTHLY'',''ONE_OFF''))');

-- 2. Scope the single-pending-request guarantee per service type so a monthly and a one-off
--    request can coexist for the same mentee/mentor pair, while duplicates of the same type cannot.
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'UX_requests_pending_pair')
    DROP INDEX UX_requests_pending_pair ON dbo.mentorship_requests;
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID(N'dbo.mentorship_requests') AND name = N'UX_requests_pending_pair')
    CREATE UNIQUE INDEX UX_requests_pending_pair
        ON dbo.mentorship_requests(mentee_id, mentor_id, service_type)
        WHERE status = 'PENDING';

COMMIT TRANSACTION;
