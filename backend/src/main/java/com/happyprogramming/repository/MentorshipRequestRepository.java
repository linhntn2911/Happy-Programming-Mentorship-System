package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorshipRequest;

import com.happyprogramming.repository.MentorRequestDecisionProjection;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MentorshipRequestRepository extends JpaRepository<MentorshipRequest, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE dbo.mentorship_requests
            SET status = :decision,
                responded_at = CASE WHEN submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, 7, SYSUTCDATETIME()) ELSE SYSUTCDATETIME() END,
                updated_at = CASE WHEN submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, 7, SYSUTCDATETIME()) ELSE SYSUTCDATETIME() END
            WHERE id = :requestId
              AND mentor_id = :mentorId
              AND status = 'PENDING'
              AND CASE WHEN submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, response_deadline) ELSE response_deadline END >= SYSUTCDATETIME()
            """, nativeQuery = true)
    int transitionPendingRequest(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId,
            @Param("decision") String decision);

    @Query(value = """
            SELECT id, status, CASE WHEN submitted_at > SYSUTCDATETIME() THEN DATEADD(HOUR, -7, responded_at) ELSE responded_at END AS respondedAt
            FROM dbo.mentorship_requests
            WHERE id = :requestId AND mentor_id = :mentorId
            """, nativeQuery = true)
    MentorRequestDecisionProjection findDecisionByIdAndMentorId(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId);

    @Query(value = """
            SELECT r.mentee_id AS menteeId,
                   mu.full_name AS mentorName,
                   so.name AS packageName,
                   r.service_type AS serviceType,
                   meu.email AS menteeEmail,
                   meu.full_name AS menteeName
            FROM dbo.mentorship_requests r
            JOIN dbo.users mu ON mu.id = r.mentor_id
            JOIN dbo.users meu ON meu.id = r.mentee_id
            LEFT JOIN dbo.service_offerings so ON so.id = r.service_id
            WHERE r.id = :requestId AND r.mentor_id = :mentorId
            """, nativeQuery = true)
    MentorDecisionContextProjection findDecisionContextByIdAndMentorId(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId);
}
