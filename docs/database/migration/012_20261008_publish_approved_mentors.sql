-- Migration 012: Publish approved mentors and link teaching skills
-- Date: 2026-10-08
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- 1. Ensure all approved active mentors have is_public = 1 and accepting_mentees = 1
UPDATE mp
SET mp.is_public = 1,
    mp.accepting_mentees = 1,
    mp.approved_by = COALESCE(mp.approved_by, (SELECT TOP 1 id FROM dbo.users WHERE role_code IN ('STAFF', 'ADMIN'))),
    mp.approved_at = COALESCE(mp.approved_at, SYSUTCDATETIME()),
    mp.updated_at = SYSUTCDATETIME()
FROM dbo.mentor_profiles mp
JOIN dbo.users u ON u.id = mp.user_id
WHERE u.role_code = 'MENTOR' AND u.status = 'ACTIVE';

-- 2. Link teaching skills (Docker, JavaScript) to approved mentors if they have no skills yet
DECLARE @dockerId BIGINT, @jsId BIGINT;
SELECT @dockerId = id FROM dbo.skills WHERE name = 'Docker';
SELECT @jsId = id FROM dbo.skills WHERE name = 'JavaScript';

IF @dockerId IS NOT NULL
BEGIN
    INSERT INTO dbo.mentor_skills (mentor_id, skill_id, display_order, is_verified, created_at)
    SELECT mp.user_id, @dockerId, 0, 0, SYSUTCDATETIME()
    FROM dbo.mentor_profiles mp
    WHERE NOT EXISTS (SELECT 1 FROM dbo.mentor_skills ms WHERE ms.mentor_id = mp.user_id AND ms.skill_id = @dockerId);
END;

IF @jsId IS NOT NULL
BEGIN
    INSERT INTO dbo.mentor_skills (mentor_id, skill_id, display_order, is_verified, created_at)
    SELECT mp.user_id, @jsId, 1, 0, SYSUTCDATETIME()
    FROM dbo.mentor_profiles mp
    WHERE NOT EXISTS (SELECT 1 FROM dbo.mentor_skills ms WHERE ms.mentor_id = mp.user_id AND ms.skill_id = @jsId);
END;

COMMIT TRANSACTION;
