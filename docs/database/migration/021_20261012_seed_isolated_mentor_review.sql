-- Opt-in synthetic mentor walkthrough; never packaged into automatic Flyway migrations.
-- Only on the disposable review database. No real bank transfer or payout is represented.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME() <> 'HPMS_SePay_Test_20261012' THROW 51000,'Dedicated test database required.',1;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM dbo.users WHERE email_normalized IN ('mentor.review@example.test','mentee.review@example.test')) THROW 51001,'Review accounts already exist; refusing replacement.',1;
DECLARE @hash VARCHAR(255)='$(HPMS_MENTOR_REVIEW_HASH)';
IF LEN(@hash)<>60 OR LEFT(@hash,4)<>'$2a$' THROW 51002,'BCrypt hash required.',1;
INSERT INTO dbo.users(email,full_name,first_name,last_name,password_hash,role_code,status,email_verified_at)
VALUES('mentor.review@example.test','Review Mentor','Review','Mentor',@hash,'MENTOR','ACTIVE',SYSUTCDATETIME());
DECLARE @mentor BIGINT=SCOPE_IDENTITY();
INSERT INTO dbo.user_roles(user_id,role_code) VALUES(@mentor,'MENTOR');
INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public)
VALUES(@mentor,'mentor-review-local','Backend Mentor','Engineer','Local Test','Synthetic mentor account for local payment and wallet walkthroughs; this profile does not represent a real provider.',5,0);
INSERT INTO dbo.users(email,full_name,role_code,status) VALUES('mentee.review@example.test','Review Mentee','MENTEE','ACTIVE');
DECLARE @mentee BIGINT=SCOPE_IDENTITY();
INSERT INTO dbo.service_offerings(mentor_id,name,service_type,description,price,session_duration_minutes,calls_per_period,trial_days,status,plan_tier)
VALUES(@mentor,'Local Review Package','MONTHLY','Synthetic review package',1000000,60,4,7,'ACTIVE','STANDARD');
DECLARE @service BIGINT=SCOPE_IDENTITY();
DECLARE @past DATETIME2(3)=DATEADD(DAY,-10,SYSUTCDATETIME());
INSERT INTO dbo.mentorship_requests(mentee_id,mentor_id,service_id,experience_level,learning_goals,offer_snapshot,status,submitted_at,response_deadline,terms_version,terms_accepted_at)
VALUES(@mentee,@mentor,@service,'BEGINNER','Learn reliable backend programming and test mentorship payment workflows.','{"price":"1000000","currency":"VND","trialDays":7}','PENDING',@past,DATEADD(HOUR,48,@past),'local-test',@past);
DECLARE @request BIGINT=SCOPE_IDENTITY();
UPDATE dbo.mentorship_requests SET status='ACCEPTED',responded_at=DATEADD(HOUR,1,@past) WHERE id=@request;
DECLARE @paid DATETIME2(3)=DATEADD(DAY,1,@past);
INSERT INTO dbo.payments(request_id,billing_cycle_no,attempt_no,gateway,merchant_reference,amount,currency,commission_rate_snapshot,status,gateway_transaction_id,created_at,paid_at,expires_at)
VALUES(@request,1,1,'SEPAY','LOCAL-MENTOR-REVIEW-20261012',1000000,'VND',15,'SUCCEEDED','SYNTHETIC-MENTOR-REVIEW-20261012',@paid,@paid,DATEADD(MINUTE,15,@paid));
DECLARE @payment BIGINT=SCOPE_IDENTITY();
INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_by,created_at)
VALUES(@payment,'HOLD',1000000,'LOCAL-MENTOR-REVIEW-HOLD-20261012',@mentee,@paid);
UPDATE dbo.mentorship_requests SET funded_at=@paid WHERE id=@request;
INSERT INTO dbo.audit_logs(actor_id,action,entity_type,entity_id,reason,ip_address)
VALUES(@mentor,'LOCAL_MENTOR_REVIEW_SEEDED','USER',CONVERT(VARCHAR(30),@mentor),'Synthetic funds on isolated test database; no real transfer.','127.0.0.1');
COMMIT;
