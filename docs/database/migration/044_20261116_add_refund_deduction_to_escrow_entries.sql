-- Migration: 044_20261116_add_refund_deduction_to_escrow_entries.sql
-- Description: Allow REFUND_DEDUCTION in CK_escrow_type for mentor clawback entries
--              and update CK_escrow_refund_required so non-REFUND_OUT entries keep refund_id NULL.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_type')
    ALTER TABLE dbo.escrow_ledger_entries DROP CONSTRAINT CK_escrow_type;

ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_type
    CHECK (entry_type IN ('HOLD','REFUND_OUT','MENTOR_RELEASE','PLATFORM_FEE','MENTOR_PAYOUT','REFUND_DEDUCTION'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.escrow_ledger_entries') AND name=N'CK_escrow_refund_required')
    ALTER TABLE dbo.escrow_ledger_entries DROP CONSTRAINT CK_escrow_refund_required;

ALTER TABLE dbo.escrow_ledger_entries ADD CONSTRAINT CK_escrow_refund_required
    CHECK ((entry_type = 'REFUND_OUT' AND refund_id IS NOT NULL) OR (entry_type <> 'REFUND_OUT' AND refund_id IS NULL));

COMMIT TRANSACTION;
