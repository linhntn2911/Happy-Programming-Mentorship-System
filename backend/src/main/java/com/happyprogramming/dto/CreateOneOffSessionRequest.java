package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateOneOffSessionRequest(
        @NotBlank @Size(max = 100) String mentorSlug,
        @NotNull @Positive Long serviceOfferingId,
        @NotBlank @Size(min = 50, max = 4000) String agenda,
        @NotBlank @Pattern(regexp = "BEGINNER|JUNIOR|MID|SENIOR") String experienceLevel,
        @NotBlank @Size(max = 50) String termsVersion,
        @NotNull @Positive Long slotHoldId,
        @NotNull @Min(1) @Max(10) Integer numberOfSessions,
        @NotNull @Min(1) @Max(10) Integer numberOfParticipants
) {
}
