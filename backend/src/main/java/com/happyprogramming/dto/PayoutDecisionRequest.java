package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PayoutDecisionRequest(
        @NotBlank @Pattern(regexp = "PAID|REJECTED") String decision,
        @Size(max = 150) String transferReference,
        @Size(max = 500) String rejectionReason) { }
