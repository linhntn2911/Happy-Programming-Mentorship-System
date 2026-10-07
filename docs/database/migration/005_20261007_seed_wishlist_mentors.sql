/*
   Temporary development seed for wishlist/profile integration.
   This is a migration, not a change to schema_31_tables.sql.
   Remove these seed rows when real mentor onboarding supplies the profiles.
   Do not remove or overwrite real records.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @staffId BIGINT;
SELECT @staffId = id FROM dbo.users WHERE email_normalized = 'seed.staff@happyprogramming.local';
IF @staffId IS NULL
BEGIN
    INSERT INTO dbo.users(email, role_code, full_name, status, email_verified_at)
    VALUES (N'seed.staff@happyprogramming.local', 'STAFF', N'HappyProgramming Seed Staff', 'ACTIVE', SYSUTCDATETIME());
    SET @staffId = SCOPE_IDENTITY();
END;

IF OBJECT_ID('dbo.user_roles', 'U') IS NOT NULL
    INSERT INTO dbo.user_roles(user_id, role_code)
    SELECT @staffId, 'STAFF'
    WHERE NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = @staffId AND role_code = 'STAFF');

DECLARE @seed TABLE (
    email NVARCHAR(254), full_name NVARCHAR(150), slug VARCHAR(200), headline NVARCHAR(250),
    job_title NVARCHAR(150), company_name NVARCHAR(200), biography NVARCHAR(1000),
    years_experience DECIMAL(4,1), language_codes NVARCHAR(500)
);
INSERT INTO @seed VALUES
(N'seed.minh-an@happyprogramming.local', N'Minh An Nguyen', 'minh-an', N'Senior Backend Engineer helping developers build reliable Java systems.', N'Senior Backend Engineer', N'FPT Software', N'Build a solid Java foundation, design better APIs, and turn your Spring Boot project into work you are proud to share. I focus on practical backend engineering and clear technical decisions.', 6, N'["vi","en"]'),
(N'seed.thao-linh@happyprogramming.local', N'Thao Linh Tran', 'thao-linh', N'Senior Frontend Developer for thoughtful, accessible web experiences.', N'Senior Frontend Developer', N'NashTech', N'Go from your first component to a thoughtful web experience with practical feedback on React, accessibility, and your portfolio. We will turn feedback into small, useful improvements.', 5, N'["vi","en"]'),
(N'seed.hoang-nam@happyprogramming.local', N'Hoang Nam Le', 'hoang-nam', N'AI and data mentor for practical machine learning projects.', N'AI & Data Engineer', N'VNG', N'Make sense of your data, understand your models, and build a machine learning project with a clear purpose and a realistic plan. I help you connect fundamentals to useful outcomes.', 7, N'["vi","en"]'),
(N'seed.david-pham@happyprogramming.local', N'David Pham', 'david-pham', N'Full-stack developer connecting product ideas to working software.', N'Full-stack Developer', N'Grab', N'Connect frontend and backend with confidence. Work through architecture decisions and get hands-on feedback on your full-stack app, from the first route to a dependable release.', 8, N'["en","vi"]'),
(N'seed.sofia-tran@happyprogramming.local', N'Sofia Tran', 'sofia-tran', N'Software engineer focused on Java, problem solving, and system design.', N'Software Engineer', N'KMS Technology', N'Strengthen your problem-solving skills, understand system design, and learn to explain the reasoning behind your technical decisions. Sessions are practical, focused, and tailored to your current project.', 5, N'["en","vi"]'),
(N'seed.alex-nguyen@happyprogramming.local', N'Alex Nguyen', 'alex-nguyen', N'DevOps engineer helping teams ship reliable applications.', N'DevOps Engineer', N'Tiki', N'Take your project from a local setup to a reliable deployment. Learn containers, delivery pipelines, and practical cloud fundamentals while building habits you can use on your next project.', 6, N'["vi","en"]');

DECLARE @email NVARCHAR(254), @fullName NVARCHAR(150), @slug VARCHAR(200), @headline NVARCHAR(250),
        @jobTitle NVARCHAR(150), @company NVARCHAR(200), @bio NVARCHAR(1000), @years DECIMAL(4,1), @languages NVARCHAR(500), @mentorId BIGINT;
DECLARE seed_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT email, full_name, slug, headline, job_title, company_name, biography, years_experience, language_codes FROM @seed;
OPEN seed_cursor;
FETCH NEXT FROM seed_cursor INTO @email, @fullName, @slug, @headline, @jobTitle, @company, @bio, @years, @languages;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @mentorId = NULL;
    SELECT @mentorId = id FROM dbo.users WHERE email_normalized = LOWER(LTRIM(RTRIM(@email)));
    IF @mentorId IS NULL
    BEGIN
        INSERT INTO dbo.users(email, role_code, full_name, status, email_verified_at)
        VALUES (@email, 'MENTOR', @fullName, 'ACTIVE', SYSUTCDATETIME());
        SET @mentorId = SCOPE_IDENTITY();
    END
    ELSE
        UPDATE dbo.users SET role_code = 'MENTOR', status = 'ACTIVE', email_verified_at = COALESCE(email_verified_at, SYSUTCDATETIME()), updated_at = SYSUTCDATETIME() WHERE id = @mentorId;

    IF OBJECT_ID('dbo.user_roles', 'U') IS NOT NULL
    BEGIN
        INSERT INTO dbo.user_roles(user_id, role_code) SELECT @mentorId, 'MENTOR' WHERE NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id=@mentorId AND role_code='MENTOR');
        INSERT INTO dbo.user_roles(user_id, role_code) SELECT @mentorId, 'MENTEE' WHERE NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id=@mentorId AND role_code='MENTEE');
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = @mentorId)
        INSERT INTO dbo.mentor_profiles(user_id, slug, headline, job_title, company_name, biography, years_experience, language_codes, is_public, accepting_mentees, max_active_mentees, approved_by, approved_at)
        VALUES (@mentorId, @slug, @headline, @jobTitle, @company, @bio, @years, @languages, 1, 1, 5, @staffId, SYSUTCDATETIME());

    FETCH NEXT FROM seed_cursor INTO @email, @fullName, @slug, @headline, @jobTitle, @company, @bio, @years, @languages;
END
CLOSE seed_cursor;
DEALLOCATE seed_cursor;
COMMIT TRANSACTION;
