package com.happyprogramming.dto;

import java.time.Instant;
import java.util.List;

public record MentorshipWorkspaceDetail(
        Long subscriptionId,
        Long requestId,
        Long conversationId,
        Long mentorId,
        String mentorName,
        Long menteeId,
        String menteeName,
        Long partnerId,
        String partnerName,
        String currentUserRole,
        String packageName,
        String subscriptionStatus,
        Instant currentPeriodStart,
        Instant currentPeriodEnd,
        Integer callsPerPeriod,
        Integer sessionDurationMinutes,
        String learningGoals,
        List<WorkspaceMessageDto> messages
) {}
