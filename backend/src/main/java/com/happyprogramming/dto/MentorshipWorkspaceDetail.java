package com.happyprogramming.dto;

import java.time.Instant;
import java.util.List;

public record MentorshipWorkspaceDetail(
        Long workspaceId,
        Long conversationId,
        Long subscriptionId,
        Long requestId,
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
        boolean hasMonthly,
        List<WorkspaceOneOffBookingDto> oneOffSessions,
        List<WorkspaceMessageDto> messages
) {}
