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
        Instant paymentExpiresAt,
        String experienceLevel,
        String background,
        String expectations) {

    public MenteeApplicationDto(
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
            Instant paymentExpiresAt,
            String experienceLevel) {
        this(requestId, mentorId, mentorName, packageName, learningGoals, status, submittedAt,
                respondedAt, responseDeadline, fundedAt, rejectionReason, latestPaymentStatus,
                paymentExpiresAt, experienceLevel, null, null);
    }

    public MenteeApplicationDto(
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
        this(requestId, mentorId, mentorName, packageName, learningGoals, status, submittedAt,
                respondedAt, responseDeadline, fundedAt, rejectionReason, latestPaymentStatus,
                paymentExpiresAt, null, null, null);
    }
}
