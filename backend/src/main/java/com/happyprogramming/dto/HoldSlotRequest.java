package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record HoldSlotRequest(
        @NotBlank @Size(max = 100) String mentorSlug,
        @NotNull @Positive Long serviceOfferingId,
        @NotNull Instant startAt) {}
