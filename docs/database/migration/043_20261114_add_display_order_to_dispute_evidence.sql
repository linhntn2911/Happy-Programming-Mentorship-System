-- Add display_order column if not present in dbo.dispute_evidence
IF COL_LENGTH('dbo.dispute_evidence', 'display_order') IS NULL
BEGIN
    ALTER TABLE dbo.dispute_evidence ADD display_order INT NULL;
END;

IF COL_LENGTH('dbo.dispute_evidence', 'uploaded_side') IS NULL
BEGIN
    ALTER TABLE dbo.dispute_evidence ADD uploaded_side VARCHAR(10) NULL DEFAULT 'MENTEE';
END;
