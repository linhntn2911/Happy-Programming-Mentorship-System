package com.happyprogramming.dto;

import jakarta.validation.constraints.*;

public record MenteeSignupRequest(
    @NotBlank @Size(max = 75) String firstName,
    @NotBlank @Size(max = 75) String lastName,
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 8, max = 128) String password
) {}
