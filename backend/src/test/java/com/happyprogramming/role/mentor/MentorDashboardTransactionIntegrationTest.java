package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorDashboardRepository;
import com.happyprogramming.role.mentee.MentorshipRequestRepository;
import com.happyprogramming.role.mentor.MentorSystemNoticeProjection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfSystemProperty(named = "hpms.dashboard.integration", matches = "true")
@TestPropertySource(properties = {
        "hpms.mentor.demo.enabled=true",
        "hpms.mentor.demo.user-id=${HPMS_MENTOR_TEST_USER_ID:0}"
})
class MentorDashboardTransactionIntegrationTest {
    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MentorshipRequestRepository requestRepository;

    @Autowired
    private MentorDashboardRepository dashboardRepository;

    @Test
    void acceptsOnlyAnUnexpiredPendingOwnedRequestWithoutCreatingFinancialRecords() {
        Long mentorId = positiveEnvironmentId("HPMS_MENTOR_TEST_USER_ID");
        Long requestId = positiveEnvironmentId("HPMS_MENTOR_TEST_REQUEST_ID");
        Object[] request = (Object[]) entityManager.createNativeQuery("""
                SELECT mentor_id, status, response_deadline
                FROM dbo.mentorship_requests
                WHERE id = :requestId
                """)
                .setParameter("requestId", requestId)
                .getSingleResult();

        assertEquals(mentorId.longValue(), ((Number) request[0]).longValue());
        assertEquals("PENDING", request[1]);
        LocalDateTime deadline = ((java.sql.Timestamp) request[2]).toLocalDateTime();
        Assumptions.assumeTrue(deadline.toInstant(ZoneOffset.UTC).isAfter(java.time.Instant.now()),
                "The integration request must have an active response window.");

        assertEquals(1, requestRepository.transitionPendingRequest(requestId, mentorId, "ACCEPTED"));
        assertEquals(0, requestRepository.transitionPendingRequest(requestId, mentorId, "REJECTED"));
        assertEquals(0L, count(
                "SELECT COUNT_BIG(*) FROM dbo.payments WHERE request_id = :requestId", requestId));
        assertEquals(0L, count(
                "SELECT COUNT_BIG(*) FROM dbo.subscriptions WHERE request_id = :requestId", requestId));
        assertEquals(0L, count("""
                SELECT COUNT_BIG(*)
                FROM dbo.escrow_ledger_entries ledger
                JOIN dbo.payments payment ON payment.id = ledger.payment_id
                WHERE payment.request_id = :requestId
                """, requestId));
    }

    @Test
    void noticeProjectionExecutesWithinMentorScopeAndReturnsAtMostTenRows() {
        Long mentorId = positiveEnvironmentId("HPMS_MENTOR_TEST_USER_ID");

        List<MentorSystemNoticeProjection> notices =
                dashboardRepository.findRecentSystemNotices(mentorId);

        assertTrue(notices.size() <= 10);
    }

    private long count(String query, Long requestId) {
        return ((Number) entityManager.createNativeQuery(query)
                .setParameter("requestId", requestId)
                .getSingleResult())
                .longValue();
    }

    private static Long positiveEnvironmentId(String name) {
        String value = System.getenv(name);
        Assumptions.assumeTrue(value != null && value.matches("[1-9][0-9]*"),
                name + " must be set to a positive local test ID.");
        return Long.valueOf(value);
    }
}
