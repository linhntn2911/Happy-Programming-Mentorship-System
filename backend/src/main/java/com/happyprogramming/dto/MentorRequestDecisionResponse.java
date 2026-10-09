package com.happyprogramming.dto;

import java.time.Instant;

public record MentorRequestDecisionResponse(
        Long requestId,
        String status,
        Instant respondedAt) {
}
