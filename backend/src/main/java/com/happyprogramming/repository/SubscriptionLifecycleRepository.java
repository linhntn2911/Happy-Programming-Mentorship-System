package com.happyprogramming.repository;

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
}
