package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CheckoutInfoDto(
        Long requestId,
        Long mentorId,
        String mentorName,
        String mentorTitle,
        String mentorAvatarUrl,
        String packageName,
        String serviceType,
        BigDecimal amount,
        String currency,
        Integer sessionDurationMinutes,
        Integer callsPerPeriod,
        String learningGoals,
        String status,
        boolean isPaid,
        String paymentStatus,
        Instant paymentExpiresAt,
        String paymentReference,
        boolean priceAvailable,
        String qrCodeUrl,
        String bankName,
        String accountNumber,
        String accountHolder,
        Integer numberOfSessions,
        Integer numberOfParticipants,
        Instant sessionStartAt,
        Instant sessionEndAt,
        Instant serverNow,
        Long paymentRemainingSeconds
) {
    public CheckoutInfoDto(Long requestId, Long mentorId, String mentorName, String mentorTitle,
                           String mentorAvatarUrl, String packageName, String serviceType, BigDecimal amount, String currency,
                           Integer sessionDurationMinutes, Integer callsPerPeriod, String learningGoals,
                           String status, boolean isPaid, String paymentStatus, Instant paymentExpiresAt,
                           String paymentReference, boolean priceAvailable) {
        this(requestId, mentorId, mentorName, mentorTitle, mentorAvatarUrl, packageName, serviceType, amount, currency,
                sessionDurationMinutes, callsPerPeriod, learningGoals, status, isPaid, paymentStatus,
                paymentExpiresAt, paymentReference, priceAvailable, null, null, null, null,
                null, null, null, null, null, null);
    }
}
