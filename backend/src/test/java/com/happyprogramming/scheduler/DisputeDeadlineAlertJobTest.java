package com.happyprogramming.scheduler;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.happyprogramming.repository.DisputeDeadlineRepository;
import com.happyprogramming.service.DisputeDeadlineService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class DisputeDeadlineAlertJobTest {
    @Test
    void delegatesEveryScheduledRunToDeadlineService() {
        RecordingService service = new RecordingService();
        DisputeDeadlineAlertJob job = new DisputeDeadlineAlertJob(service);

        job.sendApproachingAndOverdueAlerts();
        job.sendApproachingAndOverdueAlerts();

        assertEquals(2, service.calls);
    }

    private static final class RecordingService extends DisputeDeadlineService {
        private int calls;

        private RecordingService() {
            super(new DisputeDeadlineRepository(new JdbcTemplate()), null, 6, 12);
        }

        @Override
        public AlertResult sendDeadlineAlerts() {
            calls += 1;
            return new AlertResult(0, 0);
        }
    }
}
