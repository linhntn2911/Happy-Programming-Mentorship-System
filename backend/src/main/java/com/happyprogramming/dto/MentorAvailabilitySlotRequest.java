package com.happyprogramming.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record MentorAvailabilitySlotRequest(
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        @Size(max = 500) String reason) {}
