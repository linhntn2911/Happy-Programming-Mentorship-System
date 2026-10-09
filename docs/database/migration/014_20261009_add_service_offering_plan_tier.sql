-- Migration 014: Add package tier classification to service_offerings
-- Date: 2026-10-09
--
-- Task 3 requires mentors to configure dynamic monthly packages classified as LITE, STANDARD or
-- PRO, each with its own price/description and an independent active toggle. A mentor may enable
-- any subset (1, 2 or 3) of the tiers. The offering model already lives in dbo.service_offerings
-- (name, description, price, benefits, status, display_order); this migration adds the tier
-- classification without forking the model, so the existing booking/request flow that reads a
-- mentor's MONTHLY offering keeps working. The immutable init baseline is never edited.
--
-- GO batch separators are required: SQL Server compiles a batch before running it, so a column
-- added in one statement cannot be referenced by a later statement in the SAME batch. Flyway runs
-- these batches inside one transaction, so the migration stays atomic.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Add the nullable tier column.
IF COL_LENGTH('dbo.service_offerings', 'plan_tier') IS NULL
    ALTER TABLE dbo.service_offerings ADD plan_tier VARCHAR(20) NULL;
GO

-- 2. Constrain tier values (NULL allowed for ONE_OFF offerings and legacy rows).
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_service_offerings_plan_tier')
    ALTER TABLE dbo.service_offerings
        ADD CONSTRAINT CK_service_offerings_plan_tier
        CHECK (plan_tier IS NULL OR plan_tier IN ('LITE', 'STANDARD', 'PRO'));
GO

-- 3. Backfill existing MONTHLY offerings to STANDARD so current mentors keep one visible package.
UPDATE dbo.service_offerings
SET plan_tier = 'STANDARD',
    updated_at = SYSUTCDATETIME()
WHERE service_type = 'MONTHLY' AND plan_tier IS NULL;
GO

-- 4. Enforce at most one MONTHLY offering per (mentor, tier).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_offerings_mentor_tier')
    CREATE UNIQUE INDEX UX_offerings_mentor_tier
        ON dbo.service_offerings (mentor_id, plan_tier)
        WHERE service_type = 'MONTHLY' AND plan_tier IS NOT NULL;
GO
