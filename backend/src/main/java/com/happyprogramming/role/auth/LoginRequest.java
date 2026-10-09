package com.happyprogramming.role.auth;

import jakarta.validation.constraints.*;

public record LoginRequest(
    @NotBlank @Email @Size(max = 254) String email,
    @NotBlank @Size(max = 128) String password,
    @Pattern(regexp = "MENTEE|MENTOR|STAFF|ADMIN") String role
) {}
