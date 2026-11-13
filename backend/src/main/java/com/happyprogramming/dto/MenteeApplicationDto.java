package com.happyprogramming.dto;

import java.time.Instant;

public record MenteeApplicationDto(
        Long requestId,
        Long mentorId,
        String mentorName,
        String packageName,
        String learningGoals,
        String status,
        Instant submittedAt,
        Instant respondedAt,
        Instant responseDeadline,
        Instant fundedAt,
        String rejectionReason,
        String latestPaymentStatus,
        Instant paymentExpiresAt) {
}
