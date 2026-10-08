package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record MentorProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank
                @Pattern(regexp = "(?s)^\\s*\\S.{48,998}\\S\\s*$")
                String biography,
        @NotNull @DecimalMin("0.0") @DecimalMax("80.0") @Digits(integer = 2, fraction = 1)
                BigDecimal yearsExperience,
        @Size(max = 500) @Pattern(regexp = "(?i)^$|^https?://[^\\s]+$") String githubUrl,
        @Size(max = 500) @Pattern(regexp = "(?i)^$|^https?://[^\\s]+$") String linkedinUrl,
        @Size(max = 500) @Pattern(regexp = "(?i)^$|^https?://[^\\s]+$") String portfolioUrl,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Positive Long> skillIds
) {
}
