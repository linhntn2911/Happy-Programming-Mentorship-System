package com.happyprogramming.role.mentor;

import java.time.Instant;

public record MentorSystemNotice(
        String id,
        String type,
        Long requestId,
        String menteeName,
        String status,
        Instant occurredAt,
        Instant completedAt,
        String message) {
}
