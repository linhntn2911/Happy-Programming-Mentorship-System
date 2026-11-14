package com.happyprogramming.repository;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SubscriptionLifecycleRepository {
    private final JdbcTemplate jdbc;

    public SubscriptionLifecycleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Ends subscriptions whose paid period was not extended by a renewal. Disputed and
     * terminal subscriptions are deliberately outside the status predicate.
     */
    public int endExpiredSubscriptions() {
        return jdbc.update("""
                UPDATE dbo.subscriptions
                SET status = 'ENDED',
                    next_billing_at = NULL,
                    updated_at = SYSUTCDATETIME()
                WHERE status IN ('TRIALING','ACTIVE','PAST_DUE')
                  AND current_period_end IS NOT NULL
                  AND current_period_end <= SYSUTCDATETIME()
                """);
    }

    /**
     * Activates only completed trials that still have paid time remaining. This is called
     * after the expiry update so an overdue subscription cannot be activated accidentally.
     */
    public int activateCompletedTrials() {
        return jdbc.update("""
                UPDATE dbo.subscriptions
                SET status = 'ACTIVE',
                    updated_at = SYSUTCDATETIME()
                WHERE status = 'TRIALING'
                  AND trial_ends_at IS NOT NULL
                  AND trial_ends_at <= SYSUTCDATETIME()
                  AND current_period_end > SYSUTCDATETIME()
                """);
    }

    public record Day5ReminderTarget(
            long subscriptionId,
            long requestId,
            long menteeId,
            String menteeName,
            String menteeEmail,
            long mentorId,
            String mentorName,
            String packageName,
            java.time.Instant trialEndsAt
    ) {}

    /**
     * Identifies active monthly subscriptions on Day 5 from activation (hold safety period reminder).
     * Prevents duplicate notifications by checking for existing DAY5_ASSURANCE_REMINDER notifications.
     */
    public List<Day5ReminderTarget> findEligibleDay5Reminders() {
        if (jdbc == null || jdbc.getDataSource() == null) {
            return List.of();
        }
        return jdbc.query("""
                SELECT s.id AS subscription_id,
                       s.request_id,
                       s.mentee_id,
                       u_mentee.full_name AS mentee_name,
                       u_mentee.email AS mentee_email,
                       s.mentor_id,
                       u_mentor.full_name AS mentor_name,
                       COALESCE(JSON_VALUE(s.plan_snapshot, '$.name'), N'Monthly Mentorship') AS package_name,
                       s.trial_ends_at
                FROM dbo.subscriptions s
                JOIN dbo.users u_mentee ON u_mentee.id = s.mentee_id
                JOIN dbo.users u_mentor ON u_mentor.id = s.mentor_id
                WHERE s.status IN ('TRIALING', 'ACTIVE')
                  AND s.activated_at IS NOT NULL
                  AND SYSUTCDATETIME() >= DATEADD(DAY, 5, s.activated_at)
                  AND (s.trial_ends_at IS NULL OR SYSUTCDATETIME() < s.trial_ends_at)
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.notifications n
                      WHERE n.user_id = s.mentee_id
                        AND n.type = 'DAY5_ASSURANCE_REMINDER'
                        AND n.action_url LIKE '%requestId=' + CAST(s.request_id AS VARCHAR(30)) + '%'
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.disputes d
                      WHERE d.subscription_id = s.id
                        AND d.status NOT IN ('CANCELLED', 'REJECTED')
                  )
                """, (rs, rowNum) -> new Day5ReminderTarget(
                rs.getLong("subscription_id"),
                rs.getLong("request_id"),
                rs.getLong("mentee_id"),
                rs.getString("mentee_name"),
                rs.getString("mentee_email"),
                rs.getLong("mentor_id"),
                rs.getString("mentor_name"),
                rs.getString("package_name"),
                rs.getTimestamp("trial_ends_at") != null ? rs.getTimestamp("trial_ends_at").toInstant() : null
        ));
    }
}
