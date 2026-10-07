package com.happyprogramming.service;

import com.happyprogramming.dto.MentorDashboardResponse;
import com.happyprogramming.dto.MentorRequestDecisionRequest;
import com.happyprogramming.dto.MentorRequestDecisionResponse;
import com.happyprogramming.dto.MentorSystemNotice;
import com.happyprogramming.repository.MentorDashboardRatingProjection;
import com.happyprogramming.repository.MentorDashboardRepository;
import com.happyprogramming.repository.MentorDashboardRequestProjection;
import com.happyprogramming.repository.MentorRequestDecisionProjection;
import com.happyprogramming.repository.MentorshipRequestRepository;
import com.happyprogramming.repository.MentorSystemNoticeProjection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MentorDashboardServiceTest {
    @Mock
    private MentorService mentorService;
    @Mock
    private MentorDashboardRepository dashboardRepository;
    @Mock
    private MentorshipRequestRepository requestRepository;

    private MentorDashboardService service;

    @BeforeEach
    void setUp() {
        service = new MentorDashboardService(
                mentorService, dashboardRepository, requestRepository);
        when(mentorService.requireCurrentActiveMentorId()).thenReturn(42L);
    }

    @Test
    void dashboardAggregatesOnlyServerResolvedMentorMetricsAndRecords() {
        when(dashboardRepository.getNetEarningsForMentor(42L)).thenReturn(new BigDecimal("1250000.00"));
        when(dashboardRepository.countPendingRequestsForMentor(42L)).thenReturn(2L);
        when(dashboardRepository.getPublishedRatingForMentor(42L))
                .thenReturn(new RatingProjection(new BigDecimal("4.50"), 2L));
        when(dashboardRepository.findPendingRequestsForMentor(42L))
                .thenReturn(List.of(new RequestProjection(
                        19L, "Mentee Example", "Backend Mentorship",
                        "I want to build reliable API services with clear testing and deployment practices.",
                        "PENDING",
                        LocalDateTime.parse("2026-10-01T10:00:00"),
                        LocalDateTime.parse("2026-10-03T10:00:00"))));
        when(dashboardRepository.findRecentSystemNotices(42L)).thenReturn(List.of());

        MentorDashboardResponse response = service.getMyDashboard();

        assertEquals(new BigDecimal("1250000.00"), response.summary().netEarnings());
        assertEquals("VND", response.summary().currency());
        assertEquals(2L, response.summary().pendingInvitations());
        assertEquals(new BigDecimal("4.50"), response.summary().averageRating());
        assertEquals(2L, response.summary().reviewCount());
        assertEquals(19L, response.incomingRequests().get(0).id());
        assertEquals("Backend Mentorship", response.incomingRequests().get(0).packageName());
        assertEquals(82, response.incomingRequests().get(0).learningGoalsSummary().length());
        assertEquals(1, response.incomingRequests().size());
        assertEquals(List.of(), response.systemNotices());
        verify(dashboardRepository).getNetEarningsForMentor(42L);
        verify(dashboardRepository).findPendingRequestsForMentor(42L);
    }

    @Test
    void emptyDashboardUsesZeroEarningsAndAnExplicitMissingRatingValue() {
        when(dashboardRepository.getNetEarningsForMentor(42L)).thenReturn(new BigDecimal("0.00"));
        when(dashboardRepository.countPendingRequestsForMentor(42L)).thenReturn(0L);
        when(dashboardRepository.getPublishedRatingForMentor(42L))
                .thenReturn(new RatingProjection(null, 0L));
        when(dashboardRepository.findPendingRequestsForMentor(42L)).thenReturn(List.of());
        when(dashboardRepository.findRecentSystemNotices(42L)).thenReturn(List.of());

        MentorDashboardResponse response = service.getMyDashboard();

        assertEquals(new BigDecimal("0.00"), response.summary().netEarnings());
        assertEquals(0L, response.summary().pendingInvitations());
        assertNull(response.summary().averageRating());
        assertEquals(0L, response.summary().reviewCount());
        assertEquals(List.of(), response.incomingRequests());
        assertEquals(List.of(), response.systemNotices());
    }

    @Test
    void decisionUsesOnlyConfiguredIdentityAndReturnsPersistedDecision() {
        LocalDateTime respondedAt = LocalDateTime.parse("2026-10-07T09:30:00");
        when(requestRepository.transitionPendingRequest(52L, 42L, "ACCEPTED")).thenReturn(1);
        when(requestRepository.findDecisionByIdAndMentorId(52L, 42L))
                .thenReturn(new DecisionProjection(52L, "ACCEPTED", respondedAt));

        MentorRequestDecisionResponse response = service.decideOnRequest(
                52L, new MentorRequestDecisionRequest("ACCEPTED"));

        assertEquals(52L, response.requestId());
        assertEquals("ACCEPTED", response.status());
        assertEquals(respondedAt.toInstant(java.time.ZoneOffset.UTC), response.respondedAt());
        verify(requestRepository).transitionPendingRequest(52L, 42L, "ACCEPTED");
    }

    @Test
    void staleOrForeignRequestDecisionReturnsOpaqueConflictWithoutReloading() {
        when(requestRepository.transitionPendingRequest(52L, 42L, "REJECTED")).thenReturn(0);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.decideOnRequest(
                        52L, new MentorRequestDecisionRequest("REJECTED")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("Request is no longer available for a decision.", exception.getReason());
    }

    @Test
    void dashboardDoesNotSuppressPersistenceFailures() {
        when(dashboardRepository.getNetEarningsForMentor(42L))
                .thenThrow(new DataAccessResourceFailureException("not exposed to callers"));

        assertThrows(DataAccessResourceFailureException.class, service::getMyDashboard);
    }

    @Test
    void disabledMentorIdentityFailsBeforeDashboardQueries() {
        when(mentorService.requireCurrentActiveMentorId()).thenThrow(
                new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE, "Mentor demo identity is not enabled."));

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, service::getMyDashboard);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        verify(dashboardRepository, never()).getNetEarningsForMentor(42L);
    }

    @Test
    void rejectedDecisionReturnsThePersistedState() {
        LocalDateTime respondedAt = LocalDateTime.parse("2026-10-07T09:30:00");
        when(requestRepository.transitionPendingRequest(52L, 42L, "REJECTED")).thenReturn(1);
        when(requestRepository.findDecisionByIdAndMentorId(52L, 42L))
                .thenReturn(new DecisionProjection(52L, "REJECTED", respondedAt));

        MentorRequestDecisionResponse response = service.decideOnRequest(
                52L, new MentorRequestDecisionRequest("REJECTED"));

        assertEquals("REJECTED", response.status());
    }

    @Test
    void noticeProjectionBecomesUtcCurrentStateSummary() {
        when(dashboardRepository.getNetEarningsForMentor(42L)).thenReturn(BigDecimal.ZERO);
        when(dashboardRepository.countPendingRequestsForMentor(42L)).thenReturn(0L);
        when(dashboardRepository.getPublishedRatingForMentor(42L))
                .thenReturn(new RatingProjection(null, 0L));
        when(dashboardRepository.findPendingRequestsForMentor(42L)).thenReturn(List.of());
        when(dashboardRepository.findRecentSystemNotices(42L)).thenReturn(List.of(
                new NoticeProjection(
                        "subscription:3", "CANCELLATION", 19L, "Mentee Example", "CANCELLED",
                        LocalDateTime.parse("2026-10-06T10:00:00"), null,
                        "Mentorship subscription cancelled"),
                new NoticeProjection(
                        "refund:8", "REFUND", 19L, "Mentee Example", "SUCCEEDED",
                        LocalDateTime.parse("2026-10-06T12:00:00"),
                        LocalDateTime.parse("2026-10-07T09:00:00"), "Refund status")));

        List<MentorSystemNotice> notices = service.getMyDashboard().systemNotices();
        MentorSystemNotice cancellation = notices.get(0);
        MentorSystemNotice refund = notices.get(1);

        assertEquals("subscription:3", cancellation.id());
        assertNull(cancellation.completedAt());
        assertEquals("refund:8", refund.id());
        assertEquals("SUCCEEDED", refund.status());
        assertEquals(
                java.time.Instant.parse("2026-10-06T12:00:00Z"),
                refund.occurredAt());
        assertEquals(
                java.time.Instant.parse("2026-10-07T09:00:00Z"),
                refund.completedAt());
    }

    private record RatingProjection(BigDecimal averageRating, long reviewCount)
            implements MentorDashboardRatingProjection {
        @Override
        public BigDecimal getAverageRating() {
            return averageRating;
        }

        @Override
        public long getReviewCount() {
            return reviewCount;
        }
    }

    private record RequestProjection(
            Long id,
            String menteeName,
            String packageName,
            String learningGoals,
            String status,
            LocalDateTime submittedAt,
            LocalDateTime responseDeadline)
            implements MentorDashboardRequestProjection {
        @Override public Long getId() { return id; }
        @Override public String getMenteeName() { return menteeName; }
        @Override public String getPackageName() { return packageName; }
        @Override public String getLearningGoals() { return learningGoals; }
        @Override public String getStatus() { return status; }
        @Override public LocalDateTime getSubmittedAt() { return submittedAt; }
        @Override public LocalDateTime getResponseDeadline() { return responseDeadline; }
    }

    private record DecisionProjection(Long id, String status, LocalDateTime respondedAt)
            implements MentorRequestDecisionProjection {
        @Override public Long getId() { return id; }
        @Override public String getStatus() { return status; }
        @Override public LocalDateTime getRespondedAt() { return respondedAt; }
    }

    private record NoticeProjection(
            String id,
            String type,
            Long requestId,
            String menteeName,
            String status,
            LocalDateTime occurredAt,
            LocalDateTime completedAt,
            String message)
            implements MentorSystemNoticeProjection {
        @Override public String getId() { return id; }
        @Override public String getType() { return type; }
        @Override public Long getRequestId() { return requestId; }
        @Override public String getMenteeName() { return menteeName; }
        @Override public String getStatus() { return status; }
        @Override public LocalDateTime getOccurredAt() { return occurredAt; }
        @Override public LocalDateTime getCompletedAt() { return completedAt; }
        @Override public String getMessage() { return message; }
    }
}
