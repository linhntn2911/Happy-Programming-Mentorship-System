package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record MenteeTransactionDto(
        Long paymentId,
        Long requestId,
        String mentorName,
        String packageName,
        String serviceType,
        BigDecimal amount,
        String currency,
        String status,
        String merchantReference,
        String gatewayTransactionId,
        Instant createdAt,
        Instant paidAt) {}
