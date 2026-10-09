package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MentorPlanRequest(
        @NotBlank @Pattern(regexp = "LITE|STANDARD|PRO") String planTier,
        @Size(max = 200) String name,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 16, fraction = 2) BigDecimal price,
        @NotNull @Min(1) @Max(1440) Integer sessionDurationMinutes,
        @NotNull @Min(0) @Max(365) Integer callsPerPeriod,
        @NotBlank @Size(max = 4000) String description,
        @Min(0) @Max(30) Integer trialDays,
        @Min(1) @Max(720) Integer responseTimeHours,
        @Pattern(regexp = "ACTIVE|INACTIVE") String status
) {
}
