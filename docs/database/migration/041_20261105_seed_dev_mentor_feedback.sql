-- Migration 041: Seed synthetic mentee feedback for the local development mentor (UC28 UI walkthrough).
-- Date: 2026-11-05
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

IF DB_NAME() NOT LIKE '%Dev%'
   AND DB_NAME() NOT LIKE '%Test%'
   AND DB_NAME() NOT LIKE '%Local%'
   AND DB_NAME() NOT LIKE '%HappyProgramming%'
    THROW 51000,'Development or isolated test database required.',1;

IF COL_LENGTH('dbo.reviews','id') IS NULL
    THROW 51004,'Apply the baseline schema before running this seed.',1;

DECLARE @mentorId BIGINT;
SELECT @mentorId = id FROM dbo.users WITH (UPDLOCK,HOLDLOCK)
WHERE email_normalized = 'nt1414856@gmail.com' AND status = 'ACTIVE';

IF @mentorId IS NULL THROW 51001,'Target active mentor account was not found.',1;

IF NOT EXISTS (SELECT 1 FROM dbo.user_roles WHERE user_id = @mentorId AND role_code = 'MENTOR')
    THROW 51002,'Target account does not have the Mentor role.',1;

-- Idempotency guard: the whole block is keyed off the first synthetic one-off booking code.
IF NOT EXISTS (SELECT 1 FROM dbo.bookings WHERE booking_code = 'DEV-FB-ONEOFF-1')
BEGIN
    BEGIN TRANSACTION;

    --------------------------------------------------------------------------------------------
    -- Service offerings (one ONE_OFF and one MONTHLY) owned by the dev mentor.
    --------------------------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'ONE_OFF' AND name = N'Dev feedback one-off')
        INSERT INTO dbo.service_offerings
            (mentor_id, name, service_type, plan_tier, description, price, currency,
             session_duration_minutes, calls_per_period, chat_included,
             response_time_hours, trial_days, benefits, status, display_order,
             created_at, updated_at)
        VALUES
            (@mentorId, N'Dev feedback one-off', 'ONE_OFF', NULL,
             N'Synthetic development-only one-off consultation used to seed mentee feedback.',
             300000, 'VND', 60, NULL, 1, 24, 0, N'[]', 'ACTIVE', 0,
             SYSUTCDATETIME(), SYSUTCDATETIME());

    IF NOT EXISTS (SELECT 1 FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'MONTHLY' AND name = N'Dev feedback monthly')
        INSERT INTO dbo.service_offerings
            (mentor_id, name, service_type, plan_tier, description, price, currency,
             session_duration_minutes, calls_per_period, chat_included,
             response_time_hours, trial_days, benefits, status, display_order,
             created_at, updated_at)
        VALUES
            (@mentorId, N'Dev feedback monthly', 'MONTHLY', NULL,
             N'Synthetic development-only monthly mentorship used to seed mentee feedback.',
             1500000, 'VND', 60, 4, 1, 24, 7, N'[]', 'ACTIVE', 0,
             SYSUTCDATETIME(), SYSUTCDATETIME());

    DECLARE @oneOffService BIGINT = (SELECT id FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'ONE_OFF' AND name = N'Dev feedback one-off');
    DECLARE @monthlyService BIGINT = (SELECT id FROM dbo.service_offerings WHERE mentor_id = @mentorId AND service_type = 'MONTHLY' AND name = N'Dev feedback monthly');

    --------------------------------------------------------------------------------------------
    -- Synthetic mentees (fb1..fb4 -> one-off, fb5..fb8 -> monthly).
    --------------------------------------------------------------------------------------------
    INSERT INTO dbo.users (email, full_name, role_code, status)
    VALUES
        ('mentee.fb1@example.test', N'Nguyễn Văn An',   'MENTEE', 'ACTIVE'),
        ('mentee.fb2@example.test', N'Trần Thị Bích',   'MENTEE', 'ACTIVE'),
        ('mentee.fb3@example.test', N'Lê Minh Cường',   'MENTEE', 'ACTIVE'),
        ('mentee.fb4@example.test', N'Phạm Hồng Đào',   'MENTEE', 'ACTIVE'),
        ('mentee.fb5@example.test', N'Võ Quốc Huy',     'MENTEE', 'ACTIVE'),
        ('mentee.fb6@example.test', N'Đặng Thị Lan',    'MENTEE', 'ACTIVE'),
        ('mentee.fb7@example.test', N'Bùi Tuấn Minh',   'MENTEE', 'ACTIVE'),
        ('mentee.fb8@example.test', N'Hồ Ngọc Quyên',   'MENTEE', 'ACTIVE');

    --------------------------------------------------------------------------------------------
    -- ONE_OFF: completed bookings, then a review per booking (correlated by booking_code).
    --------------------------------------------------------------------------------------------
    INSERT INTO dbo.bookings
        (booking_code, service_id, mentor_id, mentee_id, service_type, booking_type,
         start_at, end_at, price_snapshot, currency, terms_snapshot, status,
         completed_at, meeting_sync_status, created_at, updated_at)
    SELECT s.code, @oneOffService, @mentorId, u.id, 'ONE_OFF', 'ONE_OFF',
           s.start_at, s.end_at, 300000, 'VND', N'{}', 'COMPLETED',
           s.end_at, 'PENDING', s.end_at, s.end_at
    FROM (VALUES
        ('DEV-FB-ONEOFF-1', 'mentee.fb1@example.test', DATEADD(DAY,-6,SYSUTCDATETIME()), DATEADD(MINUTE,60,DATEADD(DAY,-6,SYSUTCDATETIME()))),
        ('DEV-FB-ONEOFF-2', 'mentee.fb2@example.test', DATEADD(DAY,-13,SYSUTCDATETIME()), DATEADD(MINUTE,60,DATEADD(DAY,-13,SYSUTCDATETIME()))),
        ('DEV-FB-ONEOFF-3', 'mentee.fb3@example.test', DATEADD(DAY,-20,SYSUTCDATETIME()), DATEADD(MINUTE,60,DATEADD(DAY,-20,SYSUTCDATETIME()))),
        ('DEV-FB-ONEOFF-4', 'mentee.fb4@example.test', DATEADD(DAY,-27,SYSUTCDATETIME()), DATEADD(MINUTE,60,DATEADD(DAY,-27,SYSUTCDATETIME())))
    ) AS s(code, email, start_at, end_at)
    JOIN dbo.users u ON u.email = s.email;

    INSERT INTO dbo.reviews (booking_id, rating, comment, visibility_status, created_at, updated_at)
    SELECT b.id, s.rating, s.comment, 'PUBLISHED', s.created_at, s.created_at
    FROM (VALUES
        ('DEV-FB-ONEOFF-1', 5, N'Buổi code review cực kỳ chi tiết, chỉ rõ từng điểm cần cải thiện và cách viết test dễ hiểu.', DATEADD(DAY,-5,SYSUTCDATETIME())),
        ('DEV-FB-ONEOFF-2', 4, N'Mentor giải thích rõ ràng về system design, hơi nhanh ở phần cuối nhưng tổng thể rất hữu ích.', DATEADD(DAY,-12,SYSUTCDATETIME())),
        ('DEV-FB-ONEOFF-3', 5, N'Đúng trọng tâm câu hỏi phỏng vấn, mình nhận được lộ trình chuẩn bị cụ thể và tự tin hơn hẳn.', DATEADD(DAY,-19,SYSUTCDATETIME())),
        ('DEV-FB-ONEOFF-4', 3, N'Buổi học ổn nhưng mình mong có thêm ví dụ thực tế và tài liệu tham khảo sau buổi gặp.', DATEADD(DAY,-26,SYSUTCDATETIME()))
    ) AS s(code, rating, comment, created_at)
    JOIN dbo.bookings b ON b.booking_code = s.code;

    --------------------------------------------------------------------------------------------
    -- MONTHLY: request (PENDING -> ACCEPTED), ENDED subscription, then a review per subscription.
    --------------------------------------------------------------------------------------------
    INSERT INTO dbo.mentorship_requests
        (mentee_id, mentor_id, service_id, service_type, experience_level, learning_goals,
         offer_snapshot, status, submitted_at, response_deadline, terms_version, terms_accepted_at)
    SELECT u.id, @mentorId, @monthlyService, 'MONTHLY', 'BEGINNER', s.goals,
           N'{"price":"1500000","currency":"VND","callsPerPeriod":4,"devSynthetic":true}',
           'PENDING', s.submitted_at, DATEADD(HOUR,48,s.submitted_at), 'dev-feedback-seed', s.submitted_at
    FROM (VALUES
        ('mentee.fb5@example.test', N'Mình muốn theo đuổi lộ trình backend bài bản, học cách thiết kế API, viết test và làm việc nhóm trong dự án thực tế.', DATEADD(DAY,-70,SYSUTCDATETIME())),
        ('mentee.fb6@example.test', N'Mục tiêu của mình là cải thiện kỹ năng React và tối ưu hiệu năng giao diện, được mentor kèm cặp hằng tuần trong một tháng.', DATEADD(DAY,-60,SYSUTCDATETIME())),
        ('mentee.fb7@example.test', N'Mình cần định hướng học thuật toán và cấu trúc dữ liệu để chuẩn bị phỏng vấn, mong có người hướng dẫn và sửa bài đều đặn.', DATEADD(DAY,-50,SYSUTCDATETIME())),
        ('mentee.fb8@example.test', N'Mình muốn xây dựng dự án cá nhân hoàn chỉnh từ đầu đến cuối, được review code và góp ý về kiến trúc cũng như cách đặt tên.', DATEADD(DAY,-40,SYSUTCDATETIME()))
    ) AS s(email, goals, submitted_at)
    JOIN dbo.users u ON u.email = s.email;

    UPDATE r SET r.status = 'ACCEPTED', r.responded_at = DATEADD(HOUR,1,r.submitted_at)
    FROM dbo.mentorship_requests r
    WHERE r.mentor_id = @mentorId AND r.service_id = @monthlyService AND r.status = 'PENDING';

    INSERT INTO dbo.subscriptions
        (request_id, service_id, mentor_id, mentee_id, agreed_price, currency, plan_snapshot,
         status, activated_at, current_period_start, current_period_end, renewal_mode,
         cancel_at_period_end, ended_at, created_at, updated_at)
    SELECT r.id, @monthlyService, @mentorId, r.mentee_id, 1500000, 'VND',
           N'{"price":"1500000","currency":"VND","callsPerPeriod":4,"devSynthetic":true}',
           'ENDED', DATEADD(HOUR,2,r.submitted_at), DATEADD(HOUR,2,r.submitted_at),
           DATEADD(DAY,30,r.submitted_at), 'MANUAL', 0, DATEADD(DAY,30,r.submitted_at),
           DATEADD(HOUR,2,r.submitted_at), DATEADD(HOUR,2,r.submitted_at)
    FROM dbo.mentorship_requests r
    WHERE r.mentor_id = @mentorId AND r.service_id = @monthlyService AND r.status = 'ACCEPTED';

    INSERT INTO dbo.reviews (subscription_id, rating, comment, visibility_status, created_at, updated_at)
    SELECT sub.id, s.rating, s.comment, 'PUBLISHED', s.created_at, s.created_at
    FROM (VALUES
        ('mentee.fb5@example.test', 4, N'Đồng hành một tháng giúp mình tiến bộ rõ rệt, mentor phản hồi chậm một chút nhưng rất có tâm.', DATEADD(DAY,-38,SYSUTCDATETIME())),
        ('mentee.fb6@example.test', 5, N'Lộ trình React rõ ràng, mỗi buổi đều có bài tập và review code kỹ, mình rất hài lòng với gói tháng này.', DATEADD(DAY,-28,SYSUTCDATETIME())),
        ('mentee.fb7@example.test', 2, N'Mình kỳ vọng nhiều buổi luyện thuật toán hơn, số buổi thực tế ít hơn so với gói nên chưa đạt mục tiêu.', DATEADD(DAY,-18,SYSUTCDATETIME())),
        ('mentee.fb8@example.test', 4, N'Dự án cá nhân hoàn thiện hơn nhiều nhờ góp ý kiến trúc của mentor, cảm ơn vì sự kiên nhẫn suốt một tháng.', DATEADD(DAY,-8,SYSUTCDATETIME()))
    ) AS s(email, rating, comment, created_at)
    JOIN dbo.users u ON u.email = s.email
    JOIN dbo.subscriptions sub ON sub.mentee_id = u.id AND sub.mentor_id = @mentorId AND sub.service_id = @monthlyService;

    COMMIT TRANSACTION;
    PRINT 'Seeded 8 synthetic mentee feedback reviews (4 one-off, 4 monthly) for mentor nt1414856@gmail.com.';
END
ELSE
    PRINT 'Dev mentor feedback already seeded; skipping.';

