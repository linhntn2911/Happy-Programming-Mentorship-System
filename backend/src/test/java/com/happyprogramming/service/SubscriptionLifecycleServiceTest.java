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

    @Test
    void sendsDay5DisputeAssuranceRemindersWhenEligible() {
        Day5ReminderRepository repository = new Day5ReminderRepository();
        SubscriptionLifecycleService service = new SubscriptionLifecycleService(repository);

        int sent = service.sendDay5DisputeAssuranceReminders();

        assertEquals(1, sent);
    }

    private static final class Day5ReminderRepository extends SubscriptionLifecycleRepository {
        private Day5ReminderRepository() {
            super(new JdbcTemplate());
        }

        @Override
        public List<Day5ReminderTarget> findEligibleDay5Reminders() {
            return List.of(new Day5ReminderTarget(
                    10L, 20L, 1L, "Mentee Test", "mentee@test.com",
                    2L, "Mentor Test", "Pro Python", null
            ));
        }
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
