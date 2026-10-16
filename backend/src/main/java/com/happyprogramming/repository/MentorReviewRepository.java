package com.happyprogramming.repository;

import com.happyprogramming.dto.MentorReviewResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read-only persistence for the mentor review list (UC28). The {@code reviews} table has no direct
 * mentor column, so the owning mentor is derived through the review's booking or subscription. Only
 * {@code PUBLISHED} reviews are returned (SRS BR-01). Timestamps are stored as UTC in DATETIME2 and
 * converted at the UTC offset so the round trip never depends on the JVM default timezone.
 */
@Repository
public class MentorReviewRepository {
    private static final String SELECT_AVERAGE_RATING = """
            SELECT AVG(CAST(review_row.rating AS DECIMAL(4,2)))
            FROM dbo.reviews review_row
            LEFT JOIN dbo.bookings booking_row ON booking_row.id = review_row.booking_id
            LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = review_row.subscription_id
            WHERE review_row.visibility_status = 'PUBLISHED'
              AND COALESCE(booking_row.mentor_id, subscription_row.mentor_id) = ?
            """;

    private static final String COUNT_PUBLISHED_REVIEWS = """
            SELECT COUNT_BIG(*)
            FROM dbo.reviews review_row
            LEFT JOIN dbo.bookings booking_row ON booking_row.id = review_row.booking_id
            LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = review_row.subscription_id
            WHERE review_row.visibility_status = 'PUBLISHED'
              AND COALESCE(booking_row.mentor_id, subscription_row.mentor_id) = ?
            """;

    private static final String SELECT_PUBLISHED_REVIEWS = """
            SELECT
                review_row.id AS id,
                review_row.rating AS rating,
                review_row.comment AS comment,
                COALESCE(mentee.full_name, 'A mentee') AS menteeName,
                COALESCE(offering.name, 'Mentorship session') AS sessionLabel,
                review_row.created_at AS createdAt
            FROM dbo.reviews review_row
            LEFT JOIN dbo.bookings booking_row ON booking_row.id = review_row.booking_id
            LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = review_row.subscription_id
            LEFT JOIN dbo.users mentee ON mentee.id = COALESCE(booking_row.mentee_id, subscription_row.mentee_id)
            LEFT JOIN dbo.service_offerings offering
                ON offering.id = COALESCE(booking_row.service_id, subscription_row.service_id)
            WHERE review_row.visibility_status = 'PUBLISHED'
              AND COALESCE(booking_row.mentor_id, subscription_row.mentor_id) = ?
            ORDER BY review_row.created_at DESC, review_row.id DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """;

    private final JdbcTemplate jdbcTemplate;

    public MentorReviewRepository(@Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public BigDecimal findAverageRating(long mentorId) {
        return jdbc().queryForObject(SELECT_AVERAGE_RATING, BigDecimal.class, mentorId);
    }

    public long countPublishedReviews(long mentorId) {
        Long count = jdbc().queryForObject(COUNT_PUBLISHED_REVIEWS, Long.class, mentorId);
        return count == null ? 0L : count;
    }

    public List<MentorReviewResponse> findPublishedReviews(long mentorId, int offset, int limit) {
        return jdbc().query(SELECT_PUBLISHED_REVIEWS, reviewMapper(), mentorId, offset, limit);
    }

    private JdbcTemplate jdbc() {
        if (jdbcTemplate == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Review storage is temporarily unavailable.");
        }
        return jdbcTemplate;
    }

    private static RowMapper<MentorReviewResponse> reviewMapper() {
        return (rs, rowNum) -> new MentorReviewResponse(
                rs.getLong("id"),
                rs.getInt("rating"),
                rs.getString("comment"),
                rs.getString("menteeName"),
                rs.getString("sessionLabel"),
                fromUtc(rs.getObject("createdAt", LocalDateTime.class)));
    }

    private static Instant fromUtc(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.toInstant(ZoneOffset.UTC);
    }
}
