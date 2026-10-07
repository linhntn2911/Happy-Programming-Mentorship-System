package com.happyprogramming.dto;

import jakarta.validation.constraints.*;

public record LoginRequest(
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(max = 128) String password,
    @NotBlank @Pattern(regexp = "MENTEE|MENTOR|STAFF|ADMIN") String role
) {}
