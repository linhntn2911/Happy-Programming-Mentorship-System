package com.happyprogramming.role.mentee;

import java.time.Instant;

public record MentorshipRequestResponse(
        Long requestId,
        String status,
        boolean paymentRequired,
        Instant submittedAt
) {
}
