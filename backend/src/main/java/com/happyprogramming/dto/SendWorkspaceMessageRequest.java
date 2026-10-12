package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SendWorkspaceMessageRequest(
        @NotBlank @Size(max = 100) String clientMessageKey,
        @NotBlank @Pattern(regexp = "TEXT|CODE") String messageType,
        @NotBlank @Size(max = 10000) String body,
        @Size(max = 50) String codeLanguage
) {}
