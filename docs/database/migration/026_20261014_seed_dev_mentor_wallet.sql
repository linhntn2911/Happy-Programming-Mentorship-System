-- Opt-in synthetic wallet funding for local development mentor
SET XACT_ABORT ON;

IF DB_NAME() NOT LIKE '%Dev%' 
   AND DB_NAME() NOT LIKE '%Test%' 
   AND DB_NAME() NOT LIKE '%Local%' 
   AND DB_NAME() NOT LIKE '%HappyProgramming%'
    THROW 51000,'Development or isolated test database required.',1;

IF COL_LENGTH('dbo.mentor_payout_requests','id') IS NULL
    THROW 51004,'Apply the current mentor wallet migrations before running this seed.',1;

-- Tắt tạm thời Trigger để cho phép seed dữ liệu giao dịch mồi
ALTER TABLE dbo.mentorship_requests DISABLE TRIGGER trg_request_approval_flow;

BEGIN TRANSACTION;

DECLARE @mentorId BIGINT;
SELECT @mentorId=id FROM dbo.users WITH (UPDLOCK,HOLDLOCK)
WHERE email_normalized='nt1414856@gmail.com' AND status='ACTIVE';

IF @mentorId IS NULL THROW 51001,'Target active mentor account was not found.',1;

IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id=@mentorId AND role_code='MENTOR')
    THROW 51002,'Target account does not have the Mentor role.',1;

IF NOT EXISTS (
    SELECT 1 FROM dbo.payments
    WHERE merchant_reference='DEV-WALLET-NT1414856-20261014'
)
BEGIN
    DECLARE @menteeId BIGINT;
    SELECT TOP 1 @menteeId=id FROM dbo.users
    WHERE role_code IN ('MENTEE','ADMIN') AND status='ACTIVE' AND id<>@mentorId ORDER BY id;

    IF @menteeId IS NULL THROW 51003,'An active non-mentor actor is required for the synthetic receipt.',1;

    DECLARE @serviceId BIGINT=NULL;
    SELECT TOP 1 @serviceId=id FROM dbo.service_offerings
    WHERE mentor_id=@mentorId AND service_type='MONTHLY' AND status='ACTIVE' ORDER BY id;

    IF @serviceId IS NULL
    BEGIN
        INSERT INTO dbo.service_offerings(mentor_id,name,service_type,description,price,currency,session_duration_minutes,calls_per_period,trial_days,status,plan_tier)
        VALUES(@mentorId,'Dev wallet verification','MONTHLY','Synthetic development-only wallet funding source.',5000000,'VND',60,1,0,'ACTIVE','STANDARD');
        SET @serviceId=SCOPE_IDENTITY();
    END;

    DECLARE @requestId BIGINT;
    INSERT INTO dbo.mentorship_requests(mentee_id,mentor_id,service_id,service_type,experience_level,learning_goals,offer_snapshot,status,submitted_at,response_deadline,responded_at,terms_version,terms_accepted_at)
    VALUES(@menteeId,@mentorId,@serviceId,'MONTHLY','BEGINNER','Synthetic development-only payout walkthrough funding; no real transfer.','{"price":"5882353","currency":"VND","devSynthetic":true}','PENDING',DATEADD(DAY,-8,SYSUTCDATETIME()),DATEADD(DAY,-6,SYSUTCDATETIME()),NULL,'dev-wallet-seed',DATEADD(DAY,-8,SYSUTCDATETIME()));
    SET @requestId=SCOPE_IDENTITY();

    DECLARE @paymentId BIGINT;
    UPDATE dbo.mentorship_requests SET status='ACCEPTED',responded_at=DATEADD(DAY,-8,SYSUTCDATETIME()) WHERE id=@requestId;

    INSERT INTO dbo.payments(request_id,billing_cycle_no,attempt_no,gateway,merchant_reference,amount,currency,commission_rate_snapshot,status,gateway_transaction_id,created_at,paid_at,expires_at)
    VALUES(@requestId,1,1,'SEPAY','DEV-WALLET-NT1414856-20261014',5882353,'VND',15,'SUCCEEDED','DEV-SYNTHETIC-NT1414856-20261014',DATEADD(DAY,-8,SYSUTCDATETIME()),DATEADD(DAY,-8,SYSUTCDATETIME()),DATEADD(DAY,-7,SYSUTCDATETIME()));
    SET @paymentId=SCOPE_IDENTITY();

    INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_by,created_at)
    VALUES(@paymentId,'HOLD',5882353,'DEV-WALLET-NT1414856-20261014',@menteeId,DATEADD(DAY,-8,SYSUTCDATETIME()));

    UPDATE dbo.mentorship_requests SET funded_at=DATEADD(DAY,-8,SYSUTCDATETIME()) WHERE id=@requestId;
END;

COMMIT TRANSACTION;

-- Bật lại Trigger ngay sau khi seed xong
ALTER TABLE dbo.mentorship_requests ENABLE TRIGGER trg_request_approval_flow;