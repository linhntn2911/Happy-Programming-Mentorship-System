-- ============================================================================
-- Migration 035: Add wallet_balance column to users table and seed mentee balance
-- ============================================================================
USE [HappyProgramming];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'wallet_balance'
)
BEGIN
    ALTER TABLE dbo.users ADD wallet_balance DECIMAL(15, 2) NOT NULL CONSTRAINT DF_users_wallet_balance DEFAULT (0.00);
    PRINT 'Added wallet_balance column to dbo.users';
END
GO

-- Seed 5,000,000 VND wallet balance for mentee@happyprogramming.vn
UPDATE dbo.users
SET wallet_balance = 5000000.00, updated_at = SYSUTCDATETIME()
WHERE email_normalized = 'mentee@happyprogramming.vn';
GO

PRINT 'Updated wallet_balance to 5,000,000 VND for mentee@happyprogramming.vn';
GO
