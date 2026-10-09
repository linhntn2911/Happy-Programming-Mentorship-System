package com.happyprogramming.role.mentor;

import java.time.Instant;

public record MentorRequestDecisionResponse(
        Long requestId,
        String status,
        Instant respondedAt) {
}
