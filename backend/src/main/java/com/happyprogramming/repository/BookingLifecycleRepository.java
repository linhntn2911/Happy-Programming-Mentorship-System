package com.happyprogramming.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BookingLifecycleRepository {
    private final JdbcTemplate jdbc;

    public BookingLifecycleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Completes only ended, paid one-off bookings. The status predicate makes repeated and
     * concurrent scheduler runs idempotent, while using end_at for completed_at preserves the
     * actual session boundary instead of the time at which a worker happened to run.
     */
    public int completeEndedOneOffBookings() {
        return jdbc.update("""
                UPDATE dbo.bookings
                SET status = 'COMPLETED',
                    completed_at = end_at,
                    completed_by = NULL,
                    updated_at = SYSUTCDATETIME()
                WHERE booking_type = 'ONE_OFF'
                  AND service_type = 'ONE_OFF'
                  AND status = 'CONFIRMED'
                  AND end_at <= SYSUTCDATETIME()
                """);
    }
}
