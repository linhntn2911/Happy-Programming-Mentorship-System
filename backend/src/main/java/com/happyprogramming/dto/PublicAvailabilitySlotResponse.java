package com.happyprogramming.dto;

import java.time.Instant;

public record PublicAvailabilitySlotResponse(
        long id,
        Instant startAt,
        Instant endAt,
        boolean available) {}
