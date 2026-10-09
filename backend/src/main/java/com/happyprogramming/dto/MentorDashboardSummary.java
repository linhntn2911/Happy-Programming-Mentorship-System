package com.happyprogramming.dto;

import java.math.BigDecimal;

public record MentorDashboardSummary(
        BigDecimal netEarnings,
        String currency,
        long pendingInvitations,
        BigDecimal averageRating,
        long reviewCount) {
}
