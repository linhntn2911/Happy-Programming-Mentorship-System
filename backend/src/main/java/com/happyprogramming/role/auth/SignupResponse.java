package com.happyprogramming.role.auth;

public record SignupResponse(
    String email,
    boolean requiresVerification,
    String message
) {}
