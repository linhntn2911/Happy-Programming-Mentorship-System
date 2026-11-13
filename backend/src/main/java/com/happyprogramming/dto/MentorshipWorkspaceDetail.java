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
        List<WorkspaceMessageDto> messages,
        boolean isMediation,
        String disputeTicketCode,
        String assignedStaffName
) {
    public MentorshipWorkspaceDetail(
            Long workspaceId, Long conversationId, Long subscriptionId, Long requestId,
            Long mentorId, String mentorName, Long menteeId, String menteeName,
            Long partnerId, String partnerName, String currentUserRole,
            String packageName, String subscriptionStatus,
            Instant currentPeriodStart, Instant currentPeriodEnd,
            Integer callsPerPeriod, Integer sessionDurationMinutes,
            String learningGoals, boolean hasMonthly,
            List<WorkspaceOneOffBookingDto> oneOffSessions,
            List<WorkspaceMessageDto> messages
    ) {
        this(workspaceId, conversationId, subscriptionId, requestId, mentorId, mentorName, menteeId, menteeName,
                partnerId, partnerName, currentUserRole, packageName, subscriptionStatus,
                currentPeriodStart, currentPeriodEnd, callsPerPeriod, sessionDurationMinutes,
                learningGoals, hasMonthly, oneOffSessions, messages, false, null, null);
    }
}
