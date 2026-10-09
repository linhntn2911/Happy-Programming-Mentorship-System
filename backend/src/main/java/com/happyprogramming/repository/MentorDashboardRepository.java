package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorshipRequest;


import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MentorDashboardRepository extends JpaRepository<MentorshipRequest, Long> {
    @Query(value = """
            SELECT COALESCE(
                SUM(CAST(ROUND(
                    (p.amount - COALESCE(refund_totals.refunded_amount, 0))
                    * (1.00 - p.commission_rate_snapshot / 100.00),
                    2
                ) AS DECIMAL(18,2))),
                CAST(0.00 AS DECIMAL(18,2))
            )
            FROM dbo.payments p
            LEFT JOIN (
                SELECT payment_id, SUM(amount) AS refunded_amount
                FROM dbo.refunds
                WHERE status = 'SUCCEEDED'
                GROUP BY payment_id
            ) refund_totals ON refund_totals.payment_id = p.id
            LEFT JOIN dbo.mentorship_requests request_row ON request_row.id = p.request_id
            LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = p.subscription_id
            LEFT JOIN dbo.bookings booking_row ON booking_row.id = p.booking_id
            WHERE p.status = 'SUCCEEDED'
              AND COALESCE(
                  request_row.mentor_id,
                  subscription_row.mentor_id,
                  booking_row.mentor_id
              ) = :mentorId
            """, nativeQuery = true)
    BigDecimal getNetEarningsForMentor(@Param("mentorId") Long mentorId);

    @Query(value = """
            SELECT COUNT_BIG(*)
            FROM dbo.mentorship_requests
            WHERE mentor_id = :mentorId AND status = 'PENDING'
            """, nativeQuery = true)
    long countPendingRequestsForMentor(@Param("mentorId") Long mentorId);

    @Query(value = """
            SELECT
                AVG(CAST(review_row.rating AS DECIMAL(4,2))) AS averageRating,
                COUNT_BIG(*) AS reviewCount
            FROM dbo.reviews review_row
            LEFT JOIN dbo.bookings booking_row ON booking_row.id = review_row.booking_id
            LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = review_row.subscription_id
            WHERE review_row.visibility_status = 'PUBLISHED'
              AND COALESCE(booking_row.mentor_id, subscription_row.mentor_id) = :mentorId
            """, nativeQuery = true)
    MentorDashboardRatingProjection getPublishedRatingForMentor(@Param("mentorId") Long mentorId);

    @Query(value = """
            SELECT
                request_row.id AS id,
                mentee.full_name AS menteeName,
                offering.name AS packageName,
                request_row.learning_goals AS learningGoals,
                request_row.status AS status,
                request_row.submitted_at AS submittedAt,
                request_row.response_deadline AS responseDeadline
            FROM dbo.mentorship_requests request_row
            JOIN dbo.users mentee ON mentee.id = request_row.mentee_id
            LEFT JOIN dbo.service_offerings offering
              ON offering.id = request_row.service_id
             AND offering.mentor_id = request_row.mentor_id
             AND offering.service_type = request_row.service_type
            WHERE request_row.mentor_id = :mentorId
              AND request_row.status = 'PENDING'
            ORDER BY request_row.response_deadline, request_row.id
            """, nativeQuery = true)
    List<MentorDashboardRequestProjection> findPendingRequestsForMentor(
            @Param("mentorId") Long mentorId);

    @Query(value = """
            WITH notice_rows AS (
                SELECT
                    CAST(CONCAT('request:', request_row.id) AS NVARCHAR(80)) AS id,
                    CAST('CANCELLATION' AS VARCHAR(20)) AS type,
                    request_row.id AS requestId,
                    mentee.full_name AS menteeName,
                    request_row.status AS status,
                    request_row.cancelled_at AS occurredAt,
                    CAST(NULL AS DATETIME2(3)) AS completedAt,
                    CAST('Mentorship request cancelled' AS NVARCHAR(200)) AS message
                FROM dbo.mentorship_requests request_row
                JOIN dbo.users mentee ON mentee.id = request_row.mentee_id
                WHERE request_row.mentor_id = :mentorId
                  AND request_row.status = 'CANCELLED'
                  AND request_row.cancelled_at IS NOT NULL

                UNION ALL

                SELECT
                    CAST(CONCAT('subscription:', subscription_row.id) AS NVARCHAR(80)) AS id,
                    CAST('CANCELLATION' AS VARCHAR(20)) AS type,
                    subscription_row.request_id AS requestId,
                    mentee.full_name AS menteeName,
                    subscription_row.status AS status,
                    subscription_row.cancelled_at AS occurredAt,
                    CAST(NULL AS DATETIME2(3)) AS completedAt,
                    CAST('Mentorship subscription cancelled' AS NVARCHAR(200)) AS message
                FROM dbo.subscriptions subscription_row
                JOIN dbo.users mentee ON mentee.id = subscription_row.mentee_id
                WHERE subscription_row.mentor_id = :mentorId
                  AND subscription_row.status = 'CANCELLED'
                  AND subscription_row.cancelled_at IS NOT NULL

                UNION ALL

                SELECT
                    CAST(CONCAT('refund:', refund_row.id) AS NVARCHAR(80)) AS id,
                    CAST('REFUND' AS VARCHAR(20)) AS type,
                    COALESCE(request_row.id, subscription_row.request_id) AS requestId,
                    mentee.full_name AS menteeName,
                    refund_row.status AS status,
                    refund_row.requested_at AS occurredAt,
                    CASE WHEN refund_row.status = 'SUCCEEDED'
                         THEN refund_row.completed_at ELSE NULL END AS completedAt,
                    CAST('Refund status' AS NVARCHAR(200)) AS message
                FROM dbo.refunds refund_row
                JOIN dbo.payments payment_row ON payment_row.id = refund_row.payment_id
                LEFT JOIN dbo.mentorship_requests request_row ON request_row.id = payment_row.request_id
                LEFT JOIN dbo.subscriptions subscription_row ON subscription_row.id = payment_row.subscription_id
                LEFT JOIN dbo.bookings booking_row ON booking_row.id = payment_row.booking_id
                JOIN dbo.users mentee
                  ON mentee.id = COALESCE(
                      request_row.mentee_id,
                      subscription_row.mentee_id,
                      booking_row.mentee_id
                  )
                WHERE COALESCE(
                    request_row.mentor_id,
                    subscription_row.mentor_id,
                    booking_row.mentor_id
                ) = :mentorId
            )
            SELECT TOP (10)
                id, type, requestId, menteeName, status, occurredAt, completedAt, message
            FROM notice_rows
            ORDER BY occurredAt DESC, id DESC
            """, nativeQuery = true)
    List<MentorSystemNoticeProjection> findRecentSystemNotices(@Param("mentorId") Long mentorId);
}
