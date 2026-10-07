package com.happyprogramming.dto;

public record SignupResponse(
    String email,
    boolean requiresVerification,
    String message
) {}
