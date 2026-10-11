package com.happyprogramming.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    @Size(max = 254, message = "Email cannot exceed 254 characters.")
    String email,

    @NotBlank(message = "Verification code is required.")
    @Pattern(regexp = "^[0-9]{6}$", message = "Verification code must be 6 digits.")
    String code,

    @NotBlank(message = "New password is required.")
    @Size(min = 8, max = 128, message = "Password must be at least 8 characters.")
    String newPassword
) {}
