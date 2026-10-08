package com.happyprogramming.dto;

import java.math.BigDecimal;

public record MentorPlanResponse(
        Long id,
        String name,
        String serviceType,
        String description,
        BigDecimal price,
        String currency,
        int sessionDurationMinutes,
        Integer callsPerPeriod,
        int trialDays,
        Integer responseTimeHours,
        boolean chatIncluded,
        String status
) {
}
