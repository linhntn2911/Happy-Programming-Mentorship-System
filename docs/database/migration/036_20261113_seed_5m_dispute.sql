-- ============================================================================
-- Migration 036: Seed/Update 5,000,000 VND dispute between mentee and mentor
-- ============================================================================
USE [HappyProgramming];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @mentee_id BIGINT;
DECLARE @mentor_id BIGINT;

SELECT @mentee_id = id FROM dbo.users WHERE email_normalized = 'mentee@happyprogramming.vn';
SELECT @mentor_id = id FROM dbo.users WHERE email_normalized = 'seed.minh-an@happyprogramming.local';

IF @mentee_id IS NOT NULL AND @mentor_id IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.disputes WHERE id = 1)
    BEGIN
        UPDATE dbo.disputes
        SET complainant_id = @mentee_id,
            respondent_id = @mentor_id,
            disputed_amount = 5000000.00,
            status = 'SUBMITTED',
            category = 'UNRESPONSIVE',
            description = N'Mentor khong phan hoi tin nhan va khong tham gia ho tro trong suot 48 gio qua (Test dispute 5M).',
            bank_name = 'MBBank',
            account_number = '0987654321',
            account_name = N'PHAM MINH MENTEE',
            assigned_staff_id = NULL,
            resolution_type = NULL,
            resolution_note = NULL,
            refund_amount = NULL,
            resolved_at = NULL,
            approved_by = NULL,
            approved_at = NULL,
            reviewed_by = NULL,
            transfer_reference = NULL,
            updated_at = SYSUTCDATETIME()
        WHERE id = 1;

        PRINT 'Successfully updated dispute #1 to 5,000,000 VND in SUBMITTED state.';
    END
END
GO
