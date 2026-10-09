package com.happyprogramming.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public record MentorApplicationResponse(Long id, Long applicantId, String name, String email,
    String status, String rejectionReason, JsonNode profile, String cvFileName,
    LocalDateTime submittedAt, LocalDateTime otpExpiresAt, LocalDateTime resendAvailableAt) {}
