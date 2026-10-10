package com.happyprogramming.dto;

import java.math.BigDecimal;

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
        Integer trialDays,
        String learningGoals,
        String status,
        boolean isPaid,
        String bankName,
        String accountNumber,
        String accountName,
        String transferContent,
        int paymentExpiresInSeconds
) {}
