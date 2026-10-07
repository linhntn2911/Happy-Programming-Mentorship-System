package com.happyprogramming.service;

import com.happyprogramming.dto.MentorDashboardRequest;
import com.happyprogramming.dto.MentorDashboardResponse;
import com.happyprogramming.dto.MentorDashboardSummary;
import com.happyprogramming.dto.MentorRequestDecisionRequest;
import com.happyprogramming.dto.MentorRequestDecisionResponse;
import com.happyprogramming.dto.MentorSystemNotice;
import com.happyprogramming.repository.MentorDashboardRatingProjection;
import com.happyprogramming.repository.MentorDashboardRepository;
import com.happyprogramming.repository.MentorDashboardRequestProjection;
import com.happyprogramming.repository.MentorRequestDecisionProjection;
import com.happyprogramming.repository.MentorshipRequestRepository;
import com.happyprogramming.repository.MentorSystemNoticeProjection;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentorDashboardService {
    private static final int LEARNING_GOALS_SUMMARY_LENGTH = 140;

    private final MentorService mentorService;
    private final MentorDashboardRepository dashboardRepository;
    private final MentorshipRequestRepository requestRepository;

    public MentorDashboardService(
            MentorService mentorService,
            MentorDashboardRepository dashboardRepository,
            MentorshipRequestRepository requestRepository) {
        this.mentorService = mentorService;
        this.dashboardRepository = dashboardRepository;
        this.requestRepository = requestRepository;
    }

    @Transactional(readOnly = true)
    public MentorDashboardResponse getMyDashboard() {
        long mentorId = mentorService.requireCurrentActiveMentorId();
        BigDecimal netEarnings = dashboardRepository.getNetEarningsForMentor(mentorId);
        long pendingInvitations = dashboardRepository.countPendingRequestsForMentor(mentorId);
        MentorDashboardRatingProjection rating =
                dashboardRepository.getPublishedRatingForMentor(mentorId);
        if (rating == null) {
            throw new IllegalStateException("Dashboard rating query returned no aggregate row.");
        }

        if (netEarnings == null) {
            throw new IllegalStateException("Dashboard earnings query returned no aggregate value.");
        }
        MentorDashboardSummary summary = new MentorDashboardSummary(
                netEarnings.setScale(2),
                "VND",
                pendingInvitations,
                rating.getAverageRating(),
                rating.getReviewCount());
        List<MentorDashboardRequest> incomingRequests =
                dashboardRepository.findPendingRequestsForMentor(mentorId).stream()
                        .map(MentorDashboardService::toRequest)
                        .toList();
        List<MentorSystemNotice> notices =
                dashboardRepository.findRecentSystemNotices(mentorId).stream()
                        .map(MentorDashboardService::toNotice)
                        .toList();
        return new MentorDashboardResponse(summary, incomingRequests, notices);
    }

    @Transactional
    public MentorRequestDecisionResponse decideOnRequest(
            long requestId, MentorRequestDecisionRequest request) {
        long mentorId = mentorService.requireCurrentActiveMentorId();
        if (requestId <= 0 || request == null
                || !("ACCEPTED".equals(request.decision()) || "REJECTED".equals(request.decision()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Decision must be ACCEPTED or REJECTED.");
        }

        int changedRows = requestRepository.transitionPendingRequest(
                requestId, mentorId, request.decision());
        if (changedRows != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Request is no longer available for a decision.");
        }

        MentorRequestDecisionProjection result =
                requestRepository.findDecisionByIdAndMentorId(requestId, mentorId);
        if (result == null || result.getRespondedAt() == null) {
            throw new IllegalStateException("Updated request decision could not be reloaded.");
        }
        return new MentorRequestDecisionResponse(
                result.getId(),
                result.getStatus(),
                toInstant(result.getRespondedAt()));
    }

    private static MentorDashboardRequest toRequest(MentorDashboardRequestProjection request) {
        String goals = request.getLearningGoals() == null ? "" : request.getLearningGoals();
        return new MentorDashboardRequest(
                request.getId(),
                request.getMenteeName(),
                request.getPackageName() == null ? "Offering unavailable" : request.getPackageName(),
                goals,
                summarizeLearningGoals(goals),
                request.getStatus(),
                toInstant(request.getSubmittedAt()),
                toInstant(request.getResponseDeadline()));
    }

    private static MentorSystemNotice toNotice(MentorSystemNoticeProjection notice) {
        return new MentorSystemNotice(
                notice.getId(),
                notice.getType(),
                notice.getRequestId(),
                notice.getMenteeName(),
                notice.getStatus(),
                toInstant(notice.getOccurredAt()),
                toInstant(notice.getCompletedAt()),
                notice.getMessage());
    }

    static String summarizeLearningGoals(String value) {
        if (value == null || value.isBlank()) {
            return "No goals provided.";
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.length() <= LEARNING_GOALS_SUMMARY_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, LEARNING_GOALS_SUMMARY_LENGTH - 1).trim() + "…";
    }

    private static Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.toInstant(ZoneOffset.UTC);
    }
}
