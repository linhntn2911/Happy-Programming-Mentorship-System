package com.happyprogramming.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class BookingLifecycleRepositoryTest {
    @Test
    void completionUpdateIsScopedToEndedConfirmedOneOffBookings() {
        RecordingJdbcTemplate jdbc = new RecordingJdbcTemplate();
        BookingLifecycleRepository repository = new BookingLifecycleRepository(jdbc);

        assertEquals(3, repository.completeEndedOneOffBookings());
        assertTrue(jdbc.sql.contains("status = 'COMPLETED'"));
        assertTrue(jdbc.sql.contains("completed_at = end_at"));
        assertTrue(jdbc.sql.contains("booking_type = 'ONE_OFF'"));
        assertTrue(jdbc.sql.contains("service_type = 'ONE_OFF'"));
        assertTrue(jdbc.sql.contains("status = 'CONFIRMED'"));
        assertTrue(jdbc.sql.contains("end_at <= SYSUTCDATETIME()"));
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private String sql;

        @Override
        public int update(String sql) {
            this.sql = sql;
            return 3;
        }
    }
}
