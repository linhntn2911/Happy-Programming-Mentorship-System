-- Migration 011: Synchronize role_code in dbo.users and populate dbo.mentor_profiles for approved mentors
-- Date: 2026-10-08
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- 1. Sync role_code in dbo.users to 'MENTOR' for any user with approved mentor application
UPDATE u
SET u.role_code = 'MENTOR',
    u.updated_at = SYSUTCDATETIME()
FROM dbo.users u
WHERE u.role_code <> 'MENTOR'
  AND (
      EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id = u.id AND r.role_code = 'MENTOR')
      OR EXISTS (SELECT 1 FROM dbo.mentor_applications a WHERE a.applicant_id = u.id AND a.status = 'APPROVED')
  );

-- 2. Ensure both MENTOR and MENTEE exist in dbo.user_roles for approved mentors
INSERT INTO dbo.user_roles (user_id, role_code)
SELECT u.id, 'MENTOR'
FROM dbo.users u
WHERE (u.role_code = 'MENTOR' OR EXISTS (SELECT 1 FROM dbo.mentor_applications a WHERE a.applicant_id = u.id AND a.status = 'APPROVED'))
  AND NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id = u.id AND r.role_code = 'MENTOR');

INSERT INTO dbo.user_roles (user_id, role_code)
SELECT u.id, 'MENTEE'
FROM dbo.users u
WHERE (u.role_code = 'MENTOR' OR EXISTS (SELECT 1 FROM dbo.mentor_applications a WHERE a.applicant_id = u.id AND a.status = 'APPROVED'))
  AND NOT EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id = u.id AND r.role_code = 'MENTEE');

-- 3. Populate missing rows in dbo.mentor_profiles for approved mentors
INSERT INTO dbo.mentor_profiles (
    user_id, slug, headline, job_title, company_name, biography,
    years_experience, experience_summary, language_codes,
    is_public, accepting_mentees, max_active_mentees,
    approved_by, approved_at, created_at, updated_at
)
SELECT 
    u.id,
    'mentor-' + CAST(u.id AS VARCHAR(20)),
    COALESCE(NULLIF(JSON_VALUE(a.profile_snapshot, '$.jobTitle'), '') + ' at ' + NULLIF(JSON_VALUE(a.profile_snapshot, '$.company'), ''), 'Experienced Software Engineering Mentor'),
    COALESCE(NULLIF(JSON_VALUE(a.profile_snapshot, '$.jobTitle'), ''), 'Software Engineer'),
    NULLIF(JSON_VALUE(a.profile_snapshot, '$.company'), ''),
    CASE 
        WHEN LEN(LTRIM(RTRIM(COALESCE(a.biography, '')))) >= 50 THEN SUBSTRING(LTRIM(RTRIM(a.biography)), 1, 1000)
        ELSE 'Experienced software engineer dedicated to mentoring mentees and developing solid programming skills.'
    END,
    COALESCE(a.years_experience, 1.0),
    a.professional_background,
    N'["vi","en"]',
    0,
    1,
    5,
    a.reviewed_by,
    a.reviewed_at,
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
FROM dbo.users u
JOIN dbo.mentor_applications a ON a.applicant_id = u.id AND a.status = 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM dbo.mentor_profiles mp WHERE mp.user_id = u.id);

COMMIT TRANSACTION;
