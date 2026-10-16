package com.happyprogramming.scheduler;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.happyprogramming.repository.BookingLifecycleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class BookingCompletionJobTest {
    @Test
    void delegatesEachRunToTheIdempotentLifecycleUpdate() {
        RecordingRepository repository = new RecordingRepository();
        BookingCompletionJob job = new BookingCompletionJob(repository);

        job.completeEndedOneOffBookings();
        job.completeEndedOneOffBookings();

        assertEquals(2, repository.calls);
    }

    private static final class RecordingRepository extends BookingLifecycleRepository {
        private int calls;

        private RecordingRepository() {
            super(new JdbcTemplate());
        }

        @Override
        public int completeEndedOneOffBookings() {
            calls += 1;
            return 0;
        }
    }
}
