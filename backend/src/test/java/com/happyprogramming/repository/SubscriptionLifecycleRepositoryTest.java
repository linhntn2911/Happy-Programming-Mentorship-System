package com.happyprogramming.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SubscriptionLifecycleRepositoryTest {
    @Test
    void expiryUpdateEndsOnlyEligibleSubscriptionsWhosePaidPeriodElapsed() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate(3);
        SubscriptionLifecycleRepository repository = new SubscriptionLifecycleRepository(jdbc);

        assertEquals(3, repository.endExpiredSubscriptions());
        String sql = jdbc.sql.get(0);
        assertTrue(sql.contains("status = 'ENDED'"));
        assertTrue(sql.contains("status IN ('TRIALING','ACTIVE','PAST_DUE')"));
        assertTrue(sql.contains("current_period_end <= SYSUTCDATETIME()"));
        assertTrue(sql.contains("next_billing_at = NULL"));
        assertFalse(sql.contains("'DISPUTED'"));
        assertFalse(sql.contains("'CANCELLED'"));
    }

    @Test
    void trialUpdateActivatesOnlyElapsedTrialsWithPaidTimeRemaining() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate(2);
        SubscriptionLifecycleRepository repository = new SubscriptionLifecycleRepository(jdbc);

        assertEquals(2, repository.activateCompletedTrials());
        String sql = jdbc.sql.get(0);
        assertTrue(sql.contains("status = 'ACTIVE'"));
        assertTrue(sql.contains("status = 'TRIALING'"));
        assertTrue(sql.contains("trial_ends_at <= SYSUTCDATETIME()"));
        assertTrue(sql.contains("current_period_end > SYSUTCDATETIME()"));
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final List<String> sql = new ArrayList<>();
        private final int result;

        private RecordingJdbcTemplate(int result) {
            this.result = result;
        }

        @Override
        public int update(String sql) {
            this.sql.add(sql);
            return result;
        }
    }
}
