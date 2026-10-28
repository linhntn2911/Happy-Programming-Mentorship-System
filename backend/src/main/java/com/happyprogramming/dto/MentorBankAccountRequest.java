package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MentorBankAccountRequest(
        @NotBlank @Size(max = 100) String bankName,
        @NotBlank @Size(max = 150) String accountName,
        @NotBlank @Pattern(regexp = "[0-9]{6,34}", message = "Enter a valid bank account number.") String accountNumber) { }
