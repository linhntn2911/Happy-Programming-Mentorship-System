-- ============================================================================
-- HappyProgramming Mentorship System (HPMS)
-- Migration: 010_20261008_add_notifications_table.sql
-- Description: Creates the notifications table for in-app bell notifications
--              including mentor application decisions, status changes, and system alerts.
-- ============================================================================

USE [HappyProgramming];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

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

    PRINT N'Created table dbo.notifications with index ix_notifications_user_created';
END;
GO
