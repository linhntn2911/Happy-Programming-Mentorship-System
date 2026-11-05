IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_url') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_url NVARCHAR(1000) NULL;
END;
