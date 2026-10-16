package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MentorOneOffSessionRequest(
        @Positive Long id,
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 4000) String description,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 16, fraction = 2) BigDecimal price,
        @NotNull @Min(10) @Max(1440) Integer sessionDurationMinutes,
        @Pattern(regexp = "ACTIVE|INACTIVE") String status
) { }
