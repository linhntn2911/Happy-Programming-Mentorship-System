SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_roles (
        user_id BIGINT NOT NULL REFERENCES dbo.users(id),
        role_code VARCHAR(20) NOT NULL,
        CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_code),
        CONSTRAINT CK_user_roles_code CHECK (role_code IN ('MENTEE','MENTOR','STAFF','ADMIN'))
    );
END;
INSERT INTO dbo.user_roles(user_id, role_code)
SELECT u.id, u.role_code FROM dbo.users u
WHERE NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code=u.role_code);
INSERT INTO dbo.user_roles(user_id, role_code)
SELECT u.id, 'MENTEE' FROM dbo.users u
WHERE u.role_code='MENTOR'
AND NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code='MENTEE');
IF COL_LENGTH('dbo.mentor_applications','otp_hash') IS NULL
BEGIN
    ALTER TABLE dbo.mentor_applications ADD
        otp_hash VARCHAR(100) NULL,
        otp_expires_at DATETIME2(3) NULL,
        otp_sent_at DATETIME2(3) NULL,
        otp_attempts INT NOT NULL CONSTRAINT DF_mentor_applications_otp_attempts DEFAULT 0,
        cv_file_name NVARCHAR(200) NULL,
        cv_content VARBINARY(MAX) NULL;
END;
COMMIT TRANSACTION;
