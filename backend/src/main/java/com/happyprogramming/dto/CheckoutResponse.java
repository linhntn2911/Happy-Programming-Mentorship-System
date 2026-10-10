package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CheckoutResponse(
        Long subscriptionId,
        Long requestId,
        String status,
        BigDecimal amount,
        String currency,
        Instant activatedAt,
        Instant trialEndsAt,
        String message
) {}
