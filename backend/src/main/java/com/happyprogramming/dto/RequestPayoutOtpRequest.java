package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record RequestPayoutOtpRequest(
        @NotNull(message = "Payout amount is required.")
        @DecimalMin(value = "1", message = "Payout amount must be at least 1 VND.")
        @Digits(integer = 16, fraction = 0, message = "Payout amount must use whole VND.")
        BigDecimal amount) { }
