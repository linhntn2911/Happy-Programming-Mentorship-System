package com.happyprogramming.dto;
import java.math.BigDecimal;
public record PayoutOtpResponse(String maskedEmail, String destinationLabel, int expiresInSeconds,
    BigDecimal feeAmount, BigDecimal netAmount, int resendAfterSeconds) { }
