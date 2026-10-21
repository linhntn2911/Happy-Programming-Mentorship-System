package com.happyprogramming.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.happyprogramming.repository.SubscriptionLifecycleRepository;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SubscriptionLifecycleServiceTest {
    @Test
    void endsExpiredPeriodsBeforeActivatingRemainingTrials() {
        RecordingRepository repository = new RecordingRepository();
        SubscriptionLifecycleService service = new SubscriptionLifecycleService(repository);

        SubscriptionLifecycleService.LifecycleResult result = service.advanceLifecycle();

        assertEquals(List.of("end", "activate"), repository.calls);
        assertEquals(4, result.ended());
        assertEquals(2, result.activated());
    }

    private static final class RecordingRepository extends SubscriptionLifecycleRepository {
        private final List<String> calls = new ArrayList<>();

        private RecordingRepository() {
            super(new JdbcTemplate());
        }

        @Override
        public int endExpiredSubscriptions() {
            calls.add("end");
            return 4;
        }

        @Override
        public int activateCompletedTrials() {
            calls.add("activate");
            return 2;
        }
    }
}
