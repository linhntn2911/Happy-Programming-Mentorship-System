package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorshipRequest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MentorshipRequestRepository extends JpaRepository<MentorshipRequest, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE dbo.mentorship_requests
            SET status = :decision,
                responded_at = SYSUTCDATETIME(),
                updated_at = SYSUTCDATETIME()
            WHERE id = :requestId
              AND mentor_id = :mentorId
              AND status = 'PENDING'
              AND response_deadline >= SYSUTCDATETIME()
            """, nativeQuery = true)
    int transitionPendingRequest(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId,
            @Param("decision") String decision);

    @Query(value = """
            SELECT id, status, responded_at AS respondedAt
            FROM dbo.mentorship_requests
            WHERE id = :requestId AND mentor_id = :mentorId
            """, nativeQuery = true)
    MentorRequestDecisionProjection findDecisionByIdAndMentorId(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId);

    @Query(value = """
            SELECT r.mentee_id AS menteeId, mu.full_name AS mentorName, so.name AS packageName
            FROM dbo.mentorship_requests r
            JOIN dbo.users mu ON mu.id = r.mentor_id
            LEFT JOIN dbo.service_offerings so ON so.id = r.service_id
            WHERE r.id = :requestId AND r.mentor_id = :mentorId
            """, nativeQuery = true)
    MentorDecisionContextProjection findDecisionContextByIdAndMentorId(
            @Param("requestId") Long requestId,
            @Param("mentorId") Long mentorId);
}
