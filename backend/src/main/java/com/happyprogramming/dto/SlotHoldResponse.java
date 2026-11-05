package com.happyprogramming.dto;

import java.time.Instant;

public record SlotHoldResponse(
        long id,
        long mentorId,
        long serviceId,
        Instant startAt,
        Instant endAt,
        Instant expiresAt,
        String status) {}
