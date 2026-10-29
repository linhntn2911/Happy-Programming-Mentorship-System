SET XACT_ABORT ON;
BEGIN TRANSACTION;
ALTER TABLE dbo.mentor_payout_requests ADD approved_by BIGINT NULL, approved_at DATETIME2(3) NULL;
ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT FK_payout_approver FOREIGN KEY(approved_by) REFERENCES dbo.users(id);
ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_status;
ALTER TABLE dbo.mentor_payout_requests DROP CONSTRAINT CK_mentor_payout_requests_review;
ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_status CHECK(status IN ('REQUESTED','APPROVED','PAID','REJECTED'));
EXEC(N'ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_payout_approval CHECK (
 (approved_by IS NULL AND approved_at IS NULL) OR (approved_by IS NOT NULL AND approved_at IS NOT NULL));');
EXEC(N'ALTER TABLE dbo.mentor_payout_requests ADD CONSTRAINT CK_mentor_payout_requests_review CHECK (
 (status=''REQUESTED'' AND approved_by IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
 OR (status=''APPROVED'' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND transfer_reference IS NULL AND rejection_reason IS NULL)
 OR (status=''PAID'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(transfer_reference)),'''') IS NOT NULL AND rejection_reason IS NULL AND (approved_by IS NULL OR approved_by<>reviewed_by))
 OR (status=''REJECTED'' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND NULLIF(LTRIM(RTRIM(rejection_reason)),'''') IS NOT NULL AND transfer_reference IS NULL AND (approved_by IS NULL OR approved_by<>reviewed_by))
);');
COMMIT;
