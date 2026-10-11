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
        boolean priceAvailable
) {}
