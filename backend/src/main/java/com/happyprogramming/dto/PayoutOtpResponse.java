package com.happyprogramming.dto;

public record PayoutOtpResponse(String maskedEmail, String destinationLabel, int expiresInSeconds) { }
