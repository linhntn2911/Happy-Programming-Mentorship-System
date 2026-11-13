package com.happyprogramming.dto;

import java.time.Instant;

public record MentorDisputeSummary(
        long id,
        String status,
        String reasonCode,
        String description,
        String targetType,
        Long targetId,
        String targetLabel,
        String complainantName,
        String resolution,
        int responseCount,
        boolean responded,
        Instant createdAt,
        Instant updatedAt) { }
