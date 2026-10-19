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
                COALESCE(JSON_VALUE(request_row.offer_snapshot, '$.name'), offering.name) AS packageName,
                request_row.service_type AS serviceType,
                request_row.learning_goals AS learningGoals,
                request_row.status AS status,
                request_row.status AS lifecycleStatus,
                CASE WHEN request_row.submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, request_row.submitted_at) ELSE request_row.submitted_at END AS submittedAt,
                CASE WHEN request_row.submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, request_row.response_deadline) ELSE request_row.response_deadline END AS responseDeadline,
                CAST(NULL AS DATETIME2(3)) AS startAt,
                CAST(NULL AS DATETIME2(3)) AS endAt,
                CAST(NULL AS INT) AS numberOfSessions,
                CAST(NULL AS INT) AS numberOfParticipants
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
            SELECT
                request_row.id AS id,
                mentee.full_name AS menteeName,
                COALESCE(JSON_VALUE(request_row.offer_snapshot, '$.name'), offering.name) AS packageName,
                request_row.service_type AS serviceType,
                request_row.learning_goals AS learningGoals,
                request_row.status AS status,
                CASE
                    WHEN request_row.status = 'PENDING' THEN 'WAITING_DECISION'
                    WHEN request_row.status IN ('REJECTED','EXPIRED','CANCELLED') THEN request_row.status
                    WHEN request_row.service_type = 'ONE_OFF' AND booking_summary.bookingStatus IS NOT NULL
                        THEN booking_summary.bookingStatus
                    WHEN request_row.service_type = 'ONE_OFF' AND request_row.funded_at IS NULL
                        THEN 'AWAITING_PAYMENT'
                    WHEN request_row.service_type = 'MONTHLY' AND request_row.status = 'ACCEPTED' AND request_row.funded_at IS NULL
                        THEN 'AWAITING_PAYMENT'
                    WHEN request_row.service_type = 'MONTHLY' AND request_row.funded_at IS NOT NULL
                        THEN 'ACTIVE'
                    ELSE request_row.status
                END AS lifecycleStatus,
                CASE WHEN request_row.submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, request_row.submitted_at) ELSE request_row.submitted_at END AS submittedAt,
                CASE WHEN request_row.submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, request_row.response_deadline) ELSE request_row.response_deadline END AS responseDeadline,
                COALESCE(booking_summary.startAt, TRY_CONVERT(DATETIME2(3), JSON_VALUE(request_row.offer_snapshot, '$.startAt'), 127)) AS startAt,
                COALESCE(booking_summary.endAt, TRY_CONVERT(DATETIME2(3), JSON_VALUE(request_row.offer_snapshot, '$.endAt'), 127)) AS endAt,
                COALESCE(booking_summary.bookingCount, TRY_CONVERT(INT, JSON_VALUE(request_row.offer_snapshot, '$.numberOfSessions')), 1) AS numberOfSessions,
                COALESCE(TRY_CONVERT(INT, JSON_VALUE(request_row.offer_snapshot, '$.numberOfParticipants')), 1) AS numberOfParticipants
            FROM dbo.mentorship_requests request_row
            JOIN dbo.users mentee ON mentee.id = request_row.mentee_id
            LEFT JOIN dbo.service_offerings offering
              ON offering.id = request_row.service_id
             AND offering.mentor_id = request_row.mentor_id
             AND offering.service_type = request_row.service_type
            OUTER APPLY (
                SELECT
                    MIN(booking_row.start_at) AS startAt,
                    MAX(booking_row.end_at) AS endAt,
                    NULLIF(COUNT(*), 0) AS bookingCount,
                    CASE
                        WHEN SUM(CASE WHEN booking_row.status = 'CONFIRMED' AND booking_row.end_at > SYSUTCDATETIME() THEN 1 ELSE 0 END) > 0 THEN 'UPCOMING'
                        WHEN SUM(CASE WHEN booking_row.status = 'CONFIRMED' THEN 1 ELSE 0 END) > 0 THEN 'CONFIRMED'
                        WHEN SUM(CASE WHEN booking_row.status = 'COMPLETED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'COMPLETED'
                        WHEN SUM(CASE WHEN booking_row.status = 'CANCELLED' THEN 1 ELSE 0 END) = COUNT(*) THEN 'CANCELLED'
                        WHEN SUM(CASE WHEN booking_row.status IN ('NO_SHOW','NO_SHOW_REVIEW') THEN 1 ELSE 0 END) > 0 THEN 'NO_SHOW'
                        ELSE MAX(booking_row.status)
                    END AS bookingStatus
                FROM dbo.bookings booking_row
                WHERE booking_row.mentor_id = request_row.mentor_id
                  AND booking_row.mentee_id = request_row.mentee_id
                  AND TRY_CONVERT(BIGINT, JSON_VALUE(booking_row.terms_snapshot, '$.requestId')) = request_row.id
            ) booking_summary
            WHERE request_row.mentor_id = :mentorId
            ORDER BY request_row.submitted_at DESC, request_row.id DESC
            """, nativeQuery = true)
    List<MentorDashboardRequestProjection> findRequestsForMentor(@Param("mentorId") Long mentorId);

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
