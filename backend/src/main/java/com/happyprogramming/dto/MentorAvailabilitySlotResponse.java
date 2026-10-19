package com.happyprogramming.dto;

import java.time.Instant;

public record MentorAvailabilitySlotResponse(
        long id,
        Instant startAt,
        Instant endAt,
        String reason,
        Instant createdAt) {}
