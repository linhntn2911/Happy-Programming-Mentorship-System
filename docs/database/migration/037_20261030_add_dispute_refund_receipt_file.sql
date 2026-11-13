SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Add receipt_file_id column to disputes for admin transfer proof / receipt
IF COL_LENGTH('dbo.disputes', 'receipt_file_id') IS NULL
BEGIN
    ALTER TABLE dbo.disputes ADD receipt_file_id BIGINT NULL;
    ALTER TABLE dbo.disputes ADD CONSTRAINT FK_disputes_receipt_file
        FOREIGN KEY (receipt_file_id) REFERENCES dbo.files(id);
END;

COMMIT TRANSACTION;
