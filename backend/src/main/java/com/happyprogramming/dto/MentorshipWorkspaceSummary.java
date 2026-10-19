package com.happyprogramming.dto;

import java.time.Instant;

public record MentorshipWorkspaceSummary(
        Long workspaceId,
        Long conversationId,
        Long subscriptionId,
        Long requestId,
        Long partnerId,
        String partnerName,
        String currentUserRole,
        String packageName,
        String subscriptionStatus,
        Instant currentPeriodStart,
        Instant currentPeriodEnd,
        Integer callsPerPeriod,
        Integer sessionDurationMinutes,
        boolean hasMonthly,
        int oneOffSessionCount,
        int upcomingSessionCount,
        Instant nextSessionAt,
        long unreadCount
) {}
