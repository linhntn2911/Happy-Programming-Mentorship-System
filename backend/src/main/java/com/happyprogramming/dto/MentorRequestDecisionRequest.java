package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MentorRequestDecisionRequest(
        @NotBlank @Pattern(regexp = "ACCEPTED|REJECTED") String decision,
        @Size(max = 1000) String reason) {

    public MentorRequestDecisionRequest(String decision) {
        this(decision, null);
    }
}

