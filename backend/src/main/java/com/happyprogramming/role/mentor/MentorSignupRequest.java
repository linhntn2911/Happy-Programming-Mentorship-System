package com.happyprogramming.role.mentor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record MentorSignupRequest(
    @NotBlank @Size(max = 75) String firstName,
    @NotBlank @Size(max = 75) String lastName,
    @NotBlank @Email @Size(max = 254) String email,
    @Size(max = 128) String password,
    @NotBlank @Size(max = 100) String jobTitle,
    @Size(max = 100) String company,
    @NotBlank @Size(max = 100) String location,
    @NotBlank @Size(max = 100) String category,
    @NotBlank @Size(max = 500) String skills,
    @NotBlank @Size(min = 50, max = 1000) String bio,
    @NotBlank @Size(max = 500) String linkedin,
    @Size(max = 100) String twitter,
    @Size(max = 500) String website,
    @NotNull @DecimalMin("0.0") @DecimalMax("80.0") BigDecimal yearsExperience,
    @NotBlank @Size(min = 30, max = 5000) String experienceSummary,
    @Size(max = 200) String cvFileName,
    @Size(max = 13981016) String cvBase64,
    @Size(max = 2800000) String photoDataUrl,
    @AssertTrue boolean acceptedTerms
) {}
