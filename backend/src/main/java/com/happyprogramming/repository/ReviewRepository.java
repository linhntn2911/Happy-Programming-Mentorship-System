package com.happyprogramming.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Repository
public class ReviewRepository {
    private final JdbcTemplate jdbc;

    public ReviewRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record BookingReviewContext(
            long bookingId,
            String bookingCode,
            long mentorId,
            long menteeId,
            String status,
            Instant startAt,
            Instant endAt,
            Instant completedAt,
            String sessionName,
            String mentorName,
            String menteeName
    ) {}

    public record ReviewEntity(
            long id,
            long bookingId,
            int rating,
            String comment,
            String visibilityStatus,
            Instant createdAt,
            String menteeName,
            String sessionName
    ) {}

    public record PublicReviewRecord(
            long id,
            int rating,
            String comment,
            String menteeName,
            String sessionName,
            Instant createdAt
    ) {}

    public Optional<BookingReviewContext> findBookingForReview(long bookingId) {
        String sql = """
                SELECT b.id, b.booking_code, b.mentor_id, b.mentee_id, b.status,
                       b.start_at, b.end_at, b.completed_at,
                       COALESCE(so.name, N'One-off session') AS session_name,
                       mentor.full_name AS mentor_name,
                       mentee.full_name AS mentee_name
                FROM dbo.bookings b
                JOIN dbo.users mentor ON mentor.id = b.mentor_id
                JOIN dbo.users mentee ON mentee.id = b.mentee_id
                LEFT JOIN dbo.service_offerings so ON so.id = b.service_id
                WHERE b.id = ?
                """;
        List<BookingReviewContext> list = jdbc.query(sql, (rs, rowNum) -> new BookingReviewContext(
                rs.getLong("id"),
                rs.getString("booking_code"),
                rs.getLong("mentor_id"),
                rs.getLong("mentee_id"),
                rs.getString("status"),
                toUtcInstant(rs.getTimestamp("start_at")),
                toUtcInstant(rs.getTimestamp("end_at")),
                toUtcInstant(rs.getTimestamp("completed_at")),
                rs.getString("session_name"),
                rs.getString("mentor_name"),
                rs.getString("mentee_name")
        ), bookingId);
        return list.stream().findFirst();
    }

    public boolean existsByBookingId(long bookingId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(1) FROM dbo.reviews WHERE booking_id = ?",
                Integer.class,
                bookingId
        );
        return count != null && count > 0;
    }

    public Optional<ReviewEntity> findReviewByBookingId(long bookingId) {
        String sql = """
                SELECT r.id, r.booking_id, r.rating, r.comment, r.visibility_status, r.created_at,
                       mentee.full_name AS mentee_name,
                       COALESCE(so.name, N'One-off session') AS session_name
                FROM dbo.reviews r
                JOIN dbo.bookings b ON b.id = r.booking_id
                JOIN dbo.users mentee ON mentee.id = b.mentee_id
                LEFT JOIN dbo.service_offerings so ON so.id = b.service_id
                WHERE r.booking_id = ?
                """;
        List<ReviewEntity> list = jdbc.query(sql, (rs, rowNum) -> new ReviewEntity(
                rs.getLong("id"),
                rs.getLong("booking_id"),
                rs.getInt("rating"),
                rs.getString("comment"),
                rs.getString("visibility_status"),
                toUtcInstant(rs.getTimestamp("created_at")),
                rs.getString("mentee_name"),
                rs.getString("session_name")
        ), bookingId);
        return list.stream().findFirst();
    }

    public long insertBookingReview(long bookingId, int rating, String comment) {
        String sql = """
                INSERT INTO dbo.reviews(
                    booking_id, subscription_id, rating, comment,
                    visibility_status, editable_until, moderation_status,
                    created_at, updated_at
                ) VALUES (
                    ?, NULL, ?, ?,
                    'PUBLISHED', DATEADD(DAY, 7, SYSUTCDATETIME()), 'NONE',
                    SYSUTCDATETIME(), SYSUTCDATETIME()
                )
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, bookingId);
            ps.setInt(2, rating);
            ps.setString(3, comment);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to retrieve generated review ID.");
        }
        return key.longValue();
    }

    public void markBookingCompleted(long bookingId, Instant completedAt) {
        jdbc.update("""
                UPDATE dbo.bookings
                SET status = 'COMPLETED',
                    completed_at = COALESCE(?, end_at),
                    updated_at = SYSUTCDATETIME()
                WHERE id = ? AND status = 'CONFIRMED'
                """,
                completedAt != null ? Timestamp.from(completedAt) : null,
                bookingId
        );
    }

    public Long resolveMentorId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }
        if (identifier.chars().allMatch(Character::isDigit)) {
            try {
                long parsed = Long.parseLong(identifier);
                return parsed > 0 ? parsed : null;
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        List<Long> ids = jdbc.queryForList(
                "SELECT user_id FROM dbo.mentor_profiles WHERE slug = ?",
                Long.class,
                identifier
        );
        return ids.isEmpty() ? null : ids.get(0);
    }

    public List<PublicReviewRecord> findPublishedReviewsByMentorId(long mentorId, int limit) {
        String sql = """
                SELECT TOP (?) r.id, r.rating, r.comment, r.created_at,
                       mentee.full_name AS mentee_name,
                       COALESCE(so.name, N'One-off session') AS session_name
                FROM dbo.reviews r
                JOIN dbo.bookings b ON b.id = r.booking_id
                JOIN dbo.users mentee ON mentee.id = b.mentee_id
                LEFT JOIN dbo.service_offerings so ON so.id = b.service_id
                WHERE b.mentor_id = ? AND r.visibility_status = 'PUBLISHED'
                ORDER BY r.created_at DESC, r.id DESC
                """;
        return jdbc.query(sql, (rs, rowNum) -> new PublicReviewRecord(
                rs.getLong("id"),
                rs.getInt("rating"),
                rs.getString("comment"),
                rs.getString("mentee_name"),
                rs.getString("session_name"),
                toUtcInstant(rs.getTimestamp("created_at"))
        ), limit, mentorId);
    }

    private static Instant toUtcInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toInstant(ZoneOffset.UTC);
    }
}
