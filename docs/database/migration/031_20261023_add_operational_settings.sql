SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.system_configs WITH (UPDLOCK,HOLDLOCK) WHERE config_key='platform.operations')
INSERT INTO dbo.system_configs(config_key,config_value,value_type,description)
VALUES ('platform.operations',N'{"value":{"maintenance":false,"announcement":"","otpResendSeconds":60,"otpExpiryMinutes":10,"withdrawalThreshold":10000,"withdrawalFee":0,"earningsHoldDays":7}}','JSON','Administrator operational controls');
IF COL_LENGTH('dbo.payments','earnings_hold_days') IS NULL
ALTER TABLE dbo.payments ADD earnings_hold_days INT NOT NULL CONSTRAINT DF_payments_hold_days DEFAULT 7 CONSTRAINT CK_payments_hold_days CHECK(earnings_hold_days BETWEEN 1 AND 90);
IF COL_LENGTH('dbo.mentor_payout_requests','fee_amount') IS NULL
ALTER TABLE dbo.mentor_payout_requests ADD fee_amount DECIMAL(18,0) NOT NULL CONSTRAINT DF_payout_fee DEFAULT 0, CONSTRAINT CK_payout_fee CHECK(fee_amount>=0 AND fee_amount<amount);
COMMIT TRANSACTION;
