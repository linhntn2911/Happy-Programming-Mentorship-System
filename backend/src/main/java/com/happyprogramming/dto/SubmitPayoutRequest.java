package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public record SubmitPayoutRequest(
        @DecimalMin(value = "1", message = "Payout amount must be at least 1 VND.")
        @Digits(integer = 16, fraction = 0, message = "Payout amount must use whole VND.")
        BigDecimal amount,
        @NotBlank(message = "Verification code is required.")
        @Pattern(regexp = "^[0-9]{6}$", message = "Verification code must be 6 digits.") String otp, BigDecimal expectedFee) {
    public SubmitPayoutRequest(BigDecimal amount,String otp) { this(amount,otp,null); }
}
