package vn.happyprogramming.mentor;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class MentorDashboardRepositoryQueryTest {
    @Test
    void earningsQueryUsesSuccessfulRefundsAndThePerPaymentCommissionSnapshot() throws Exception {
        String query = query("getNetEarningsForMentor");

        assertTrue(query.contains("commission_rate_snapshot"));
        assertTrue(query.contains("'succeeded'"));
        assertTrue(query.contains("refund"));
        assertTrue(query.contains("round"));
        assertTrue(query.contains("mentor_id"));
    }

    @Test
    void ratingQueryExcludesHiddenAndFlaggedReviews() throws Exception {
        String query = query("getPublishedRatingForMentor");

        assertTrue(query.contains("visibility_status"));
        assertTrue(query.contains("'published'"));
    }

    @Test
    void pendingRequestQueryScopesTheMentorAndPendingState() throws Exception {
        String query = query("findPendingRequestsForMentor");

        assertTrue(query.contains("mentor_id"));
        assertTrue(query.contains("'pending'"));
        assertTrue(query.contains("response_deadline"));
        assertTrue(query.contains("offering.name as packagename"));
        assertTrue(!query.contains("offering.price"));
    }

    @Test
    void decisionQueryIsOneOwnerAndDeadlineGuardedTransition() throws Exception {
        Method method = MentorshipRequestRepository.class.getMethod(
                "transitionPendingRequest", Long.class, Long.class, String.class);
        String query = method.getAnnotation(Query.class).value().toLowerCase(java.util.Locale.ROOT);

        assertTrue(query.contains("where id = :requestid"));
        assertTrue(query.contains("mentor_id = :mentorid"));
        assertTrue(query.contains("status = 'pending'"));
        assertTrue(query.contains("response_deadline >= sysutcdatetime()"));
        assertTrue(query.contains("responded_at = sysutcdatetime()"));
    }

    @Test
    void noticeQueryIsBoundedAndUsesCurrentRefundStateTimestamps() throws Exception {
        String query = query("findRecentSystemNotices");

        assertTrue(query.contains("top (10)"));
        assertTrue(query.contains("refund_row.requested_at"));
        assertTrue(query.contains("refund_row.completed_at"));
        assertTrue(query.contains("refund_row.status"));
        assertTrue(query.contains("subscription_row.status = 'cancelled'"));
        assertTrue(query.contains("request_row.status = 'cancelled'"));
        assertTrue(query.contains("order by occurredat desc"));
    }

    private static String query(String methodName) throws Exception {
        Method method = java.util.Arrays.stream(MentorDashboardRepository.class.getMethods())
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElseThrow();
        return method.getAnnotation(Query.class).value().toLowerCase(java.util.Locale.ROOT);
    }
}
