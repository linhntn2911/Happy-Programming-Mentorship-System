package com.happyprogramming.dto;

import java.time.Instant;

public record MentorshipWorkspaceSummary(
        Long workspaceId,
        Long conversationId,
        Long subscriptionId,
        Long requestId,
        Long partnerId,
        String partnerName,
        String partnerRole,
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
        long unreadCount,
        boolean isMediation,
        String disputeTicketCode,
        String assignedStaffName
) {
    public MentorshipWorkspaceSummary(
            Long workspaceId, Long conversationId, Long subscriptionId, Long requestId,
            Long partnerId, String partnerName, String partnerRole,
            String packageName, String subscriptionStatus,
            Instant currentPeriodStart, Instant currentPeriodEnd,
            Integer callsPerPeriod, Integer sessionDurationMinutes,
            boolean hasMonthly, int oneOffSessionCount, int upcomingSessionCount,
            Instant nextSessionAt, long unreadCount
    ) {
        this(workspaceId, conversationId, subscriptionId, requestId, partnerId, partnerName, partnerRole,
                packageName, subscriptionStatus, currentPeriodStart, currentPeriodEnd,
                callsPerPeriod, sessionDurationMinutes, hasMonthly, oneOffSessionCount, upcomingSessionCount,
                nextSessionAt, unreadCount, false, null, null);
    }
}
