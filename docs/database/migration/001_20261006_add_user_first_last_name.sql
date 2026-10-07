-- Migration: Add first_name and last_name to dbo.users
-- Date: 2026-10-06
-- Description: Add first_name and last_name columns to dbo.users to support structured name input during mentee and mentor registration, while preserving full_name for existing workflows.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'first_name'
)
BEGIN
    ALTER TABLE dbo.users ADD first_name NVARCHAR(75) NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'last_name'
)
BEGIN
    ALTER TABLE dbo.users ADD last_name NVARCHAR(75) NULL;
END;
