SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.mentor_payout_requests', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_payout_requests ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_mentor_payout_requests_receipt_file
        FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

COMMIT TRANSACTION;
