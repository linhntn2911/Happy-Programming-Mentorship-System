package com.happyprogramming.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PublicContactResponse(@NotNull @Email @Size(max = 254) String supportEmail) { }
