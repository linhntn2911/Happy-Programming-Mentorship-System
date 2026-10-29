CREATE OR ALTER TRIGGER dbo.trg_mentor_payout_request_lifecycle
ON dbo.mentor_payout_requests
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
        THROW 51110, 'Payout history cannot be deleted.', 1;
    IF EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
        WHERE NOT ((d.status='REQUESTED' AND i.status IN ('APPROVED','REJECTED'))
                OR (d.status='APPROVED' AND i.status IN ('PAID','REJECTED')))
           OR d.mentor_id<>i.mentor_id OR d.amount<>i.amount OR d.fee_amount<>i.fee_amount
           OR d.bank_name<>i.bank_name OR d.account_name<>i.account_name
           OR d.account_number_ciphertext<>i.account_number_ciphertext
           OR d.account_last4<>i.account_last4 OR d.requested_at<>i.requested_at
           OR (d.status='APPROVED' AND (i.approved_by IS NULL OR i.approved_at IS NULL
               OR d.approved_by<>i.approved_by OR d.approved_at<>i.approved_at))
    )
        THROW 51111, 'Payouts require Staff approval before payment; request and approval details are immutable.', 1;
END;
