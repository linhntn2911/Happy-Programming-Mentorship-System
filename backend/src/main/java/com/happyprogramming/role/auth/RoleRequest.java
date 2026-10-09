package com.happyprogramming.role.auth;

import jakarta.validation.constraints.*;
public record RoleRequest(@NotBlank @Pattern(regexp = "MENTEE|MENTOR") String role,
                          @Pattern(regexp = "mentor") String returnTo) {}
