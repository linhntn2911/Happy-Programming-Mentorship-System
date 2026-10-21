package com.happyprogramming.scheduler;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.happyprogramming.repository.SubscriptionLifecycleRepository;
import com.happyprogramming.service.SubscriptionLifecycleService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SubscriptionLifecycleJobTest {
    @Test
    void delegatesEveryScheduledRunToTheTransactionalLifecycleService() {
        RecordingService service = new RecordingService();
        SubscriptionLifecycleJob job = new SubscriptionLifecycleJob(service);

        job.advanceMonthlySubscriptions();
        job.advanceMonthlySubscriptions();

        assertEquals(2, service.calls);
    }

    private static final class RecordingService extends SubscriptionLifecycleService {
        private int calls;

        private RecordingService() {
            super(new SubscriptionLifecycleRepository(new JdbcTemplate()));
        }

        @Override
        public LifecycleResult advanceLifecycle() {
            calls += 1;
            return new LifecycleResult(0, 0);
        }
    }
}
