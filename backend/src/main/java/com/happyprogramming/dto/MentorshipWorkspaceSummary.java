package com.happyprogramming.dto;

import java.time.Instant;

public record MentorshipWorkspaceSummary(
        Long subscriptionId,
        Long requestId,
        Long conversationId,
        Long partnerId,
        String partnerName,
        String currentUserRole,
        String packageName,
        String subscriptionStatus,
        Instant currentPeriodStart,
        Instant currentPeriodEnd,
        Integer callsPerPeriod,
        Integer sessionDurationMinutes,
        long unreadCount
) {}
