package com.happyprogramming.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreatePayoutRequest(
        @DecimalMin(value = "1", message = "Payout amount must be at least 1 VND.")
        @Digits(integer = 16, fraction = 0, message = "Payout amount must use whole VND.")
        BigDecimal amount,
        @NotBlank @Size(max = 100) String bankName,
        @NotBlank @Size(max = 150) String accountName,
        @NotBlank @Pattern(regexp = "[0-9]{6,34}", message = "Enter a valid bank account number.") String accountNumber) { }
