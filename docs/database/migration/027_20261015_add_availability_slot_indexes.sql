-- Supporting indexes for the in-app mentor availability, conflict checking and slot-hold
-- query paths (Hướng C). The baseline tables availability_exceptions and slot_holds already
-- carry the correct CHECK constraints (slot_holds.status IN ('HELD','CONVERTED','RELEASED','EXPIRED')),
-- so this migration only adds non-clustered indexes to keep overlap and expiry scans efficient.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_availability_exceptions_mentor_time'
      AND object_id = OBJECT_ID('dbo.availability_exceptions')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_availability_exceptions_mentor_time
        ON dbo.availability_exceptions(mentor_id, exception_type, start_at, end_at);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_slot_holds_mentor_status_time'
      AND object_id = OBJECT_ID('dbo.slot_holds')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_slot_holds_mentor_status_time
        ON dbo.slot_holds(mentor_id, status, start_at, end_at);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_slot_holds_status_expires'
      AND object_id = OBJECT_ID('dbo.slot_holds')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_slot_holds_status_expires
        ON dbo.slot_holds(status, expires_at);
END

COMMIT TRANSACTION;
