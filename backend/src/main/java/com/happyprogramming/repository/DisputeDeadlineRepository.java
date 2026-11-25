package com.happyprogramming.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DisputeDeadlineRepository {
    private final JdbcTemplate jdbc;

    public DisputeDeadlineRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<DeadlineTarget> findMentorResponseDueSoon(int warningHours) {
        return jdbc.query("""
                SELECT d.id, d.ticket_code, d.respondent_id, d.assigned_staff_id,
                       d.response_deadline_at,
                       d.resolution_deadline_at
                FROM dbo.disputes d
                WHERE d.status IN ('SUBMITTED', 'IN_MEDIATION')
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.dispute_responses r
                      WHERE r.dispute_id = d.id AND r.author_id = d.respondent_id
                  )
                  AND d.response_deadline_at > SYSUTCDATETIME()
                  AND d.response_deadline_at <= DATEADD(HOUR, ?, SYSUTCDATETIME())
                """, this::mapTarget, warningHours);
    }

    public List<DeadlineTarget> findMentorResponseOverdue() {
        return jdbc.query("""
                SELECT d.id, d.ticket_code, d.respondent_id, d.assigned_staff_id,
                       d.response_deadline_at,
                       d.resolution_deadline_at
                FROM dbo.disputes d
                WHERE d.status IN ('SUBMITTED', 'IN_MEDIATION')
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.dispute_responses r
                      WHERE r.dispute_id = d.id AND r.author_id = d.respondent_id
                  )
                  AND d.response_deadline_at IS NOT NULL
                  AND d.response_deadline_at <= SYSUTCDATETIME()
                """, this::mapTarget);
    }

    public List<DeadlineTarget> findStaffResolutionDueSoon(int warningHours) {
        return jdbc.query("""
                SELECT d.id, d.ticket_code, d.respondent_id, d.assigned_staff_id,
                       d.response_deadline_at,
                       d.resolution_deadline_at
                FROM dbo.disputes d
                WHERE d.status IN ('SUBMITTED', 'IN_MEDIATION', 'AWAITING_EVIDENCE')
                  AND d.resolution_deadline_at > SYSUTCDATETIME()
                  AND d.resolution_deadline_at <= DATEADD(HOUR, ?, SYSUTCDATETIME())
                """, this::mapTarget, warningHours);
    }

    public List<DeadlineTarget> findStaffResolutionOverdue() {
        return jdbc.query("""
                SELECT d.id, d.ticket_code, d.respondent_id, d.assigned_staff_id,
                       d.response_deadline_at,
                       d.resolution_deadline_at
                FROM dbo.disputes d
                WHERE d.status IN ('SUBMITTED', 'IN_MEDIATION', 'AWAITING_EVIDENCE')
                  AND d.resolution_deadline_at IS NOT NULL
                  AND d.resolution_deadline_at <= SYSUTCDATETIME()
                """, this::mapTarget);
    }

    private DeadlineTarget mapTarget(ResultSet rs, int rowNumber) throws SQLException {
        return new DeadlineTarget(
                rs.getLong("id"),
                rs.getString("ticket_code"),
                rs.getLong("respondent_id"),
                rs.getObject("assigned_staff_id", Long.class),
                instant(rs, "response_deadline_at"),
                instant(rs, "resolution_deadline_at"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    public record DeadlineTarget(
            long disputeId,
            String ticketCode,
            long mentorId,
            Long staffId,
            Instant responseDeadlineAt,
            Instant resolutionDeadlineAt) {
    }
}
